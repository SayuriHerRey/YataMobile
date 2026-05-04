"""
INFRAESTRUCTURA - API Controller (FastAPI)
Rutas HTTP del Notification Service.
✅ FIX: Rutas específicas ANTES que rutas con parámetros dinámicos
       para evitar que /{user_id} capture /send, /token, etc.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services.noti_service import NotiService, SendNotificationDTO, RegisterTokenDTO
from app.infraestructura.adapters.noti_repository import (
    PostgresNotiRepository,
    PostgresDeviceTokenRepository
)
from app.infraestructura.adapters.expo_push_sender import ExpoPushSender
from app.infraestructura.db import get_session

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ── Schemas Pydantic ───────────────────────────────────────────────────────
class SendNotificationRequest(BaseModel):
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[dict] = None


class RegisterTokenRequest(BaseModel):
    user_id: str
    expo_token: str


class NotificationOut(BaseModel):
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


# ── Dependencia ────────────────────────────────────────────────────────────
def get_noti_service(session: AsyncSession = Depends(get_session)) -> NotiService:
    return NotiService(
        noti_repo=PostgresNotiRepository(session),
        token_repo=PostgresDeviceTokenRepository(session),
        push_sender=ExpoPushSender(),
    )


# ── Endpoints ──────────────────────────────────────────────────────────────
# ✅ RUTAS FIJAS PRIMERO — evitan conflictos con /{user_id}

# POST /notifications/send
@router.post("/send", status_code=status.HTTP_201_CREATED, response_model=NotificationOut)
async def send_notification(
    body: SendNotificationRequest,
    svc: NotiService = Depends(get_noti_service),
):
    """Recibe notificaciones desde Order Service y las procesa."""
    try:
        dto = SendNotificationDTO(
            user_id=body.user_id,
            type=body.type,
            title=body.title,
            message=body.message,
            data=body.data,
        )
        return await svc.send_notification(dto)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


# POST /notifications/token
@router.post("/token", status_code=status.HTTP_204_NO_CONTENT)
async def register_device_token(
    body: RegisterTokenRequest,
    svc: NotiService = Depends(get_noti_service),
):
    """Registra o actualiza el token Expo Push de un dispositivo."""
    try:
        dto = RegisterTokenDTO(user_id=body.user_id, expo_token=body.expo_token)
        await svc.register_token(dto)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoints con parámetro dinámico — SIEMPRE AL FINAL ───────────────────

# ✅ FIX: /unread-count y /read-all deben ir ANTES de la ruta base /{user_id}
# porque FastAPI los resuelve en orden de declaración.

# GET /notifications/{user_id}/unread-count
@router.get("/{user_id}/unread-count")
async def get_unread_count(
    user_id: str,
    svc: NotiService = Depends(get_noti_service),
):
    """Devuelve el número de notificaciones no leídas."""
    try:
        count = await svc.get_unread_count(user_id)
        return {"user_id": user_id, "unread": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# PATCH /notifications/{user_id}/read-all
@router.patch("/{user_id}/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    user_id: str,
    svc: NotiService = Depends(get_noti_service),
):
    """Marca todas las notificaciones del usuario como leídas."""
    try:
        await svc.mark_all_read(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# GET /notifications/{user_id}   ← SIEMPRE AL ÚLTIMO (captura todo lo demás)
@router.get("/{user_id}", response_model=List[NotificationOut])
async def get_notifications(
    user_id: str,
    limit: int = 20,
    svc: NotiService = Depends(get_noti_service),
):
    """Obtiene las últimas notificaciones del usuario."""
    try:
        return await svc.get_user_notifications(user_id, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
