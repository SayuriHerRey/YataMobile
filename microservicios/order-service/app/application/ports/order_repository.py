"""
APLICACIÓN - Puerto de salida (contrato)
Define QUÉ necesita el servicio; la infraestructura decide CÓMO.
"""
from abc import ABC, abstractmethod
from typing import Optional
from app.domain.order import Order, OrderStatus


class OrderRepository(ABC):

    @abstractmethod
    async def save(self, order: Order) -> Order:
        """Persiste una orden nueva o actualizada."""
        ...

    @abstractmethod
    async def find_by_id(self, order_id: str) -> Optional[Order]:
        ...

    @abstractmethod
    async def find_by_student(self, student_id: str) -> list[Order]:
        """Historial de órdenes de un estudiante."""
        ...

    @abstractmethod
    async def find_by_status(self, status: OrderStatus) -> list[Order]:
        """Para el KDS: trae todas las órdenes con un estado dado."""
        ...

    @abstractmethod
    async def find_all_active(self) -> list[Order]:
        """KDS: recibido + en_preparacion + listo (todos excepto entregados)."""
        ...

    @abstractmethod
    async def generate_order_number(self) -> str:
        """Genera el próximo número correlativo tipo #A-243."""
        ...


class NotificationPort(ABC):
    """
    Puerto hacia el Notification Service.
    Order Service solo publica eventos; Notification Service los consume.
    """

    @abstractmethod
    async def notify_order_status_changed(
        self,
        student_id: str,
        order_number: str,
        new_status: OrderStatus,
    ) -> None:
        ...