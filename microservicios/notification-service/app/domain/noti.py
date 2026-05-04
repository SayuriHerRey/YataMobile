"""
DOMINIO - Entidad Notification
Representa una notificación push/in-app para el estudiante.
Refleja pushNotifications: true del PerfilScreen y los estados de SeguimientoScreen.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class NotificationType(str, Enum):
    ORDER_STATUS = "order_status"   # Cambio de estado del pedido (principal)
    PROMO        = "promo"          # Promociones de la cafetería
    SYSTEM       = "system"         # Mensajes del sistema


class NotificationStatus(str, Enum):
    PENDING   = "pending"    # Creada, aún no enviada
    SENT      = "sent"       # Enviada al proveedor push (Expo)
    DELIVERED = "delivered"  # Confirmada por el dispositivo
    FAILED    = "failed"     # Error al enviar


@dataclass
class Notification:
    id: str
    user_id: str                        # student_id del destinatario
    type: NotificationType
    title: str
    message: str
    status: NotificationStatus = NotificationStatus.PENDING
    is_read: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    extra_data: dict = field(default_factory=dict)  # {"order_number": "#A-242", "status": "listo"}

    # ── Reglas de negocio ─────────────────────────────────────────────────
    def mark_sent(self) -> None:
        if self.status != NotificationStatus.PENDING:
            raise ValueError(f"No se puede marcar como enviada: estado actual '{self.status}'")
        self.status = NotificationStatus.SENT
        self.sent_at = datetime.utcnow()

    def mark_delivered(self) -> None:
        self.status = NotificationStatus.DELIVERED

    def mark_failed(self) -> None:
        self.status = NotificationStatus.FAILED

    def mark_read(self) -> None:
        self.is_read = True

    def is_order_notification(self) -> bool:
        return self.type == NotificationType.ORDER_STATUS

    def __str__(self) -> str:
        return f"Notification({self.type.value}, user={self.user_id}, status={self.status.value})"


@dataclass
class DeviceToken:
    """Token Expo Push del dispositivo del estudiante."""
    user_id: str
    expo_token: str                     # Formato: ExponentPushToken[xxx]
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = datetime.utcnow()
