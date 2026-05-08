"""
APLICACIÓN - Servicio de Notificaciones
Orquesta dominio + puertos. Sin lógica HTTP ni SQL.
"""
import uuid
from dataclasses import dataclass
from typing import Optional
from app.domain.noti import Notification, DeviceToken, NotificationType, NotificationStatus
from app.application.ports.noti_repository import NotiRepository, DeviceTokenRepository, PushSenderPort


# ── DTOs de entrada ────────────────────────────────────────────────────────
@dataclass
class SendNotificationDTO:
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[dict] = None


@dataclass
class RegisterTokenDTO:
    user_id: str
    expo_token: str


# ── DTOs de salida ─────────────────────────────────────────────────────────
@dataclass
class NotificationOut:
    id: str
    user_id: str
    type: str
    title: str
    message: str
    status: str
    is_read: bool
    created_at: str
    sent_at: Optional[str]
    extra_data: dict


def _to_out(n: Notification) -> NotificationOut:
    return NotificationOut(
        id=n.id,
        user_id=n.user_id,
        type=n.type.value,
        title=n.title,
        message=n.message,
        status=n.status.value,
        is_read=n.is_read,
        created_at=n.created_at.isoformat(),
        sent_at=n.sent_at.isoformat() if n.sent_at else None,
        extra_data=n.extra_data,
    )


# ── Servicio principal ─────────────────────────────────────────────────────
class NotiService:
    def __init__(
        self,
        noti_repo: NotiRepository,
        token_repo: DeviceTokenRepository,
        push_sender: PushSenderPort,
    ):
        self._noti = noti_repo
        self._tokens = token_repo
        self._push = push_sender

    # 1. Enviar notificación (llamado por Order Service)
    async def send_notification(self, dto: SendNotificationDTO) -> NotificationOut:
        saved = None
        try:
            # Validar y convertir tipo
            try:
                noti_type = NotificationType(dto.type)
            except ValueError:
                noti_type = NotificationType.ORDER_STATUS  # fallback seguro

            noti = Notification(
                id=str(uuid.uuid4()),
                user_id=dto.user_id,
                type=noti_type,
                title=dto.title,
                message=dto.message,
                extra_data=dto.data or {},
            )

            # Persistir primero (siempre queda en BD)
            saved = await self._noti.save(noti)

            # Obtener tokens activos del usuario
            tokens = await self._tokens.find_by_user(dto.user_id)
            active_tokens = [t for t in tokens if t.is_active]

            if not active_tokens:
                # No hay tokens registrados — notificación queda en BD sin push
                print(f"ℹ️  Usuario {dto.user_id} sin tokens activos. Notificación guardada en BD.")
                return _to_out(saved)

            # Intentar envío push a cada token activo
            any_success = False
            for token in active_tokens:
                try:
                    success = await self._push.send(
                        expo_token=token.expo_token,
                        title=saved.title,
                        message=saved.message,
                        data=saved.extra_data,
                    )
                    if success:
                        any_success = True
                        print(f"✅ Push enviado a {token.expo_token[:20]}...")
                    else:
                        # Token inválido o expirado → desactivar
                        print(f"⚠️  Token inválido, desactivando: {token.expo_token[:20]}...")
                        await self._tokens.deactivate_token(token.expo_token)
                except Exception as push_err:
                    print(f"❌ Error enviando push a {token.expo_token[:20]}...: {push_err}")

            # Actualizar estado en BD según resultado del push
            # ⚠️ FIX: sólo llamamos mark_sent/mark_failed si sigue en PENDING
            if saved.status == NotificationStatus.PENDING:
                if any_success:
                    saved.mark_sent()
                else:
                    saved.mark_failed()
                await self._noti.save(saved)

            return _to_out(saved)

        except Exception as e:
            print(f"❌ Error en NotiService.send_notification: {e}")
            if saved is not None:
                return _to_out(saved)
            # Caso extremo: ni siquiera se pudo guardar
            return NotificationOut(
                id="error",
                user_id=dto.user_id,
                type="system",
                title="Error",
                message="No se pudo procesar la notificación",
                status="failed",
                is_read=False,
                created_at="",
                sent_at=None,
                extra_data={},
            )

    # 2. Registrar token Expo (llamado desde la app móvil al iniciar sesión)
    async def register_token(self, dto: RegisterTokenDTO) -> None:
        try:
            if not dto.expo_token.startswith("ExponentPushToken["):
                print(f"⚠️  Token con formato inválido: {dto.expo_token}")
                return
            token = DeviceToken(
                user_id=dto.user_id,
                expo_token=dto.expo_token,
            )
            await self._tokens.save_token(token)
            print(f"✅ Token registrado para usuario {dto.user_id}")
        except Exception as e:
            print(f"❌ Error registrando token: {e}")
            raise

    # 3. Bandeja de notificaciones
    async def get_user_notifications(
        self, user_id: str, limit: int = 20
    ) -> list[NotificationOut]:
        try:
            notis = await self._noti.find_by_user(user_id, limit)
            return [_to_out(n) for n in notis]
        except Exception as e:
            print(f"❌ Error obteniendo notificaciones: {e}")
            return []

    # 4. Conteo de no leídas
    async def get_unread_count(self, user_id: str) -> int:
        try:
            return await self._noti.count_unread(user_id)
        except Exception:
            return 0

    # 5. Marcar todas como leídas
    async def mark_all_read(self, user_id: str) -> None:
        try:
            await self._noti.mark_all_read(user_id)
        except Exception as e:
            print(f"❌ Error marcando notificaciones como leídas: {e}")
