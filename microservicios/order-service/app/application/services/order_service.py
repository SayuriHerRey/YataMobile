"""
APLICACIÓN - Servicio de Órdenes
Orquesta el dominio + puertos. Sin lógica HTTP ni SQL.
"""
import uuid
from dataclasses import dataclass
from typing import Optional
from app.domain.order import (
    Order, OrderItem, OrderItemCustomization,
    OrderStatus, PaymentMethod
)
from app.application.ports.order_repository import OrderRepository, NotificationPort


# ── DTOs de entrada ────────────────────────────────────────────────────────
@dataclass
class ItemCustomizationDTO:
    size_name: Optional[str] = None
    size_price: float = 0.0
    removed_ingredients: list[str] = None
    added_extras: list[str] = None
    special_instructions: Optional[str] = None


@dataclass
class CreateOrderItemDTO:
    product_id: str
    name: str
    quantity: int
    unit_price: float
    customization: Optional[ItemCustomizationDTO] = None


@dataclass
class CreateOrderDTO:
    student_id: str
    items: list[CreateOrderItemDTO]
    payment_method: str
    special_instructions: Optional[str] = None
    generate_receipt: bool = True
    priority: bool = False


# ── DTOs de salida ─────────────────────────────────────────────────────────
@dataclass
class OrderItemOut:
    id: str
    product_id: str
    name: str
    quantity: int
    unit_price: float
    subtotal: float
    customization_text: str
    done: bool


@dataclass
class OrderOut:
    id: str
    order_number: str
    student_id: str
    items: list[OrderItemOut]
    total: float
    payment_method: str
    status: str
    priority: bool
    special_instructions: Optional[str]
    generate_receipt: bool
    elapsed_minutes: int
    is_urgent: bool
    created_at: str
    started_at: Optional[str]
    finished_at: Optional[str]


def _to_order_out(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        order_number=order.order_number,
        student_id=order.student_id,
        items=[
            OrderItemOut(
                id=i.id,
                product_id=i.product_id,
                name=i.name,
                quantity=i.quantity,
                unit_price=i.unit_price,
                subtotal=i.subtotal,
                customization_text=i.customization.to_display_text() if i.customization else "",
                done=i.done,
            )
            for i in order.items
        ],
        total=order.total,
        payment_method=order.payment_method.value,
        status=order.status.value,
        priority=order.priority,
        special_instructions=order.special_instructions,
        generate_receipt=order.generate_receipt,
        elapsed_minutes=order.elapsed_minutes(),
        is_urgent=order.is_urgent(),
        created_at=order.created_at.isoformat(),
        started_at=order.started_at.isoformat() if order.started_at else None,
        finished_at=order.finished_at.isoformat() if order.finished_at else None,
    )


# ── Servicio principal ─────────────────────────────────────────────────────
class OrderService:
    def __init__(
        self,
        repo: OrderRepository,
        notifier: NotificationPort,
    ):
        self._repo = repo
        self._notifier = notifier

    # 1. Crear pedido
    async def create_order(self, dto: CreateOrderDTO) -> OrderOut:
        order_number = await self._repo.generate_order_number()

        items = []
        for item_dto in dto.items:
            custom = None
            if item_dto.customization:
                c = item_dto.customization
                custom = OrderItemCustomization(
                    size_name=c.size_name,
                    size_price=c.size_price or 0.0,
                    removed_ingredients=tuple(c.removed_ingredients or []),
                    added_extras=tuple(c.added_extras or []),
                    special_instructions=c.special_instructions,
                )
            items.append(OrderItem(
                id=str(uuid.uuid4()),
                product_id=item_dto.product_id,
                name=item_dto.name,
                quantity=item_dto.quantity,
                unit_price=item_dto.unit_price,
                customization=custom,
            ))

        order = Order(
            id=str(uuid.uuid4()),
            order_number=order_number,
            student_id=dto.student_id,
            items=items,
            payment_method=PaymentMethod(dto.payment_method),
            status=OrderStatus.RECIBIDO,
            priority=dto.priority,
            special_instructions=dto.special_instructions,
            generate_receipt=dto.generate_receipt,
        )

        saved = await self._repo.save(order)

        # Notificar creación del pedido
        await self._notifier.notify_order_status_changed(
            student_id=saved.student_id,
            order_number=saved.order_number,
            new_status=OrderStatus.RECIBIDO,
        )

        return _to_order_out(saved)

    # 2. Obtener órdenes activas para KDS
    async def get_active_orders(self) -> list[OrderOut]:
        orders = await self._repo.find_all_active()
        orders.sort(key=lambda o: (not o.priority, o.created_at))
        return [_to_order_out(o) for o in orders]

    # 3. Iniciar preparación
    async def start_preparation(self, order_id: str) -> OrderOut:
        order = await self._get_or_raise(order_id)
        order.start_preparation()
        saved = await self._repo.save(order)

        await self._notifier.notify_order_status_changed(
            saved.student_id, saved.order_number, OrderStatus.EN_PREPARACION
        )
        return _to_order_out(saved)

    # 4. Marcar ítem como hecho
    async def mark_item_done(self, order_id: str, item_id: str) -> OrderOut:
        order = await self._get_or_raise(order_id)
        order.mark_item_done(item_id)
        saved = await self._repo.save(order)
        return _to_order_out(saved)

    # 5. Marcar orden como lista
    async def mark_order_ready(self, order_id: str) -> OrderOut:
        order = await self._get_or_raise(order_id)
        order.mark_as_ready()
        saved = await self._repo.save(order)

        await self._notifier.notify_order_status_changed(
            saved.student_id, saved.order_number, OrderStatus.LISTO
        )
        return _to_order_out(saved)

    # 6. Marcar orden como entregada
    async def mark_order_delivered(self, order_id: str) -> OrderOut:
        order = await self._get_or_raise(order_id)
        order.mark_as_delivered()
        saved = await self._repo.save(order)

        await self._notifier.notify_order_status_changed(
            saved.student_id, saved.order_number, OrderStatus.ENTREGADO
        )
        return _to_order_out(saved)

    # 7. Obtener estado de un pedido (SeguimientoScreen)
    async def get_order_status(self, order_id: str) -> OrderOut:
        order = await self._get_or_raise(order_id)
        return _to_order_out(order)

    # 8. Historial del estudiante
    async def get_student_history(self, student_id: str) -> list[OrderOut]:
        orders = await self._repo.find_by_student(student_id)
        return [_to_order_out(o) for o in orders]

    # ── Helper ───────────────────────────────────────────────────────────
    async def _get_or_raise(self, order_id: str) -> Order:
        order = await self._repo.find_by_id(order_id)
        if not order:
            raise ValueError(f"Orden '{order_id}' no encontrada.")
        return order