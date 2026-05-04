"""
APLICACIÓN - Puerto de salida (contrato)
Define los contratos que la infraestructura debe implementar.
"""
from abc import ABC, abstractmethod
from typing import Optional
from app.domain.noti import Notification, DeviceToken, NotificationStatus


class NotiRepository(ABC):
    """Puerto de persistencia de notificaciones."""

    @abstractmethod
    async def save(self, notification: Notification) -> Notification:
        ...

    @abstractmethod
    async def find_by_id(self, noti_id: str) -> Optional[Notification]:
        ...

    @abstractmethod
    async def find_by_user(self, user_id: str, limit: int = 20) -> list[Notification]:
        """Bandeja de notificaciones del estudiante (más recientes primero)."""
        ...

    @abstractmethod
    async def count_unread(self, user_id: str) -> int:
        ...

    @abstractmethod
    async def mark_all_read(self, user_id: str) -> None:
        ...


class DeviceTokenRepository(ABC):
    """Puerto de persistencia de tokens Expo Push."""

    @abstractmethod
    async def save_token(self, token: DeviceToken) -> DeviceToken:
        ...

    @abstractmethod
    async def find_by_user(self, user_id: str) -> list[DeviceToken]:
        """Un usuario puede tener varios dispositivos."""
        ...

    @abstractmethod
    async def deactivate_token(self, expo_token: str) -> None:
        ...


class PushSenderPort(ABC):
    """Puerto de envío real al proveedor push (Expo Push API)."""

    @abstractmethod
    async def send(self, expo_token: str, title: str, message: str, data: dict) -> bool:
        """Retorna True si el envío fue exitoso."""
        ...
