"""
INFRAESTRUCTURA - Adaptador PostgreSQL para órdenes
Implementa OrderRepository usando SQLAlchemy async.
"""
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Float, Boolean, DateTime, Integer,
    ForeignKey, Text, select, func
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.order import (
    Order, OrderItem, OrderItemCustomization,
    OrderStatus, PaymentMethod
)
from app.application.ports.order_repository import OrderRepository

logger = logging.getLogger(__name__)

# ── Modelos SQLAlchemy ─────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


class OrderModel(Base):
    __tablename__ = "orders"

    id: Mapped[str]              = mapped_column(String(36), primary_key=True)
    order_number: Mapped[str]    = mapped_column(String(20), unique=True, nullable=False, index=True)
    student_id: Mapped[str]      = mapped_column(String(36), nullable=False, index=True)
    # Usamos String en lugar de SAEnum para evitar conflictos con el tipo enum de PostgreSQL
    payment_method: Mapped[str]  = mapped_column(String(20), nullable=False)
    status: Mapped[str]          = mapped_column(String(20), nullable=False, index=True)
    total: Mapped[float]         = mapped_column(Float, nullable=False)
    priority: Mapped[bool]       = mapped_column(Boolean, default=False)
    special_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    generate_receipt: Mapped[bool]  = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[datetime | None]  = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    items: Mapped[list["OrderItemModel"]] = relationship(
        "OrderItemModel",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class OrderItemModel(Base):
    __tablename__ = "order_items"

    id: Mapped[str]          = mapped_column(String(36), primary_key=True)
    order_id: Mapped[str]    = mapped_column(ForeignKey("orders.id"), nullable=False)
    product_id: Mapped[str]  = mapped_column(String(36), nullable=False)
    name: Mapped[str]        = mapped_column(String(150), nullable=False)
    quantity: Mapped[int]    = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float]= mapped_column(Float, nullable=False)
    done: Mapped[bool]       = mapped_column(Boolean, default=False)

    size_name: Mapped[str | None]             = mapped_column(String(50), nullable=True)
    size_price: Mapped[float]                 = mapped_column(Float, default=0.0)
    removed_ingredients: Mapped[str | None]   = mapped_column(Text, nullable=True)
    added_extras: Mapped[str | None]          = mapped_column(Text, nullable=True)
    special_instructions: Mapped[str | None]  = mapped_column(Text, nullable=True)

    order: Mapped["OrderModel"] = relationship("OrderModel", back_populates="items")


# ── Mapeadores dominio ↔ modelo ────────────────────────────────────────────
def _item_model_to_domain(m: OrderItemModel) -> OrderItem:
    custom = None
    if any([m.size_name, m.removed_ingredients, m.added_extras, m.special_instructions]):
        custom = OrderItemCustomization(
            size_name=m.size_name,
            size_price=m.size_price or 0.0,
            removed_ingredients=tuple(m.removed_ingredients.split(",")) if m.removed_ingredients else (),
            added_extras=tuple(m.added_extras.split(",")) if m.added_extras else (),
            special_instructions=m.special_instructions,
        )
    return OrderItem(
        id=m.id,
        product_id=m.product_id,
        name=m.name,
        quantity=m.quantity,
        unit_price=m.unit_price,
        customization=custom,
        done=m.done,
    )


def _order_model_to_domain(m: OrderModel) -> Order:
    return Order(
        id=m.id,
        order_number=m.order_number,
        student_id=m.student_id,
        items=[_item_model_to_domain(i) for i in m.items],
        # Convertir string -> enum del dominio
        payment_method=PaymentMethod(m.payment_method),
        status=OrderStatus(m.status),
        priority=m.priority,
        special_instructions=m.special_instructions,
        generate_receipt=m.generate_receipt,
        created_at=m.created_at,
        started_at=m.started_at,
        finished_at=m.finished_at,
    )


def _order_domain_to_model(order: Order) -> OrderModel:
    model = OrderModel(
        id=order.id,
        order_number=order.order_number,
        student_id=order.student_id,
        # Convertir enum -> string (.value) para guardar en VARCHAR
        payment_method=order.payment_method.value,
        status=order.status.value,
        total=order.total,
        priority=order.priority,
        special_instructions=order.special_instructions,
        generate_receipt=order.generate_receipt,
        created_at=order.created_at,
        started_at=order.started_at,
        finished_at=order.finished_at,
    )
    model.items = [
        OrderItemModel(
            id=item.id,
            order_id=order.id,
            product_id=item.product_id,
            name=item.name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            done=item.done,
            size_name=item.customization.size_name if item.customization else None,
            size_price=item.customization.size_price if item.customization else 0.0,
            removed_ingredients=",".join(item.customization.removed_ingredients) if item.customization else None,
            added_extras=",".join(item.customization.added_extras) if item.customization else None,
            special_instructions=item.customization.special_instructions if item.customization else None,
        )
        for item in order.items
    ]
    return model


# ── Repositorio ────────────────────────────────────────────────────────────
class PostgresOrderRepository(OrderRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, order: Order) -> Order:
        logger.info(f"💾 Guardando orden {order.id} con estado {order.status.value}")
        
        existing = await self._session.get(OrderModel, order.id)
        if existing:
            # Usamos .value para guardar el string en minúsculas en el VARCHAR
            existing.status = order.status.value
            existing.started_at = order.started_at
            existing.finished_at = order.finished_at
            existing.priority = order.priority
            
            logger.info(f"🔄 Actualizando orden existente: {order.id} -> {order.status.value}")
            
            # Actualizar items
            item_map = {i.id: i for i in order.items}
            for item_model in existing.items:
                if item_model.id in item_map:
                    item_model.done = item_map[item_model.id].done
                    
            await self._session.commit()
            await self._session.refresh(existing)
            logger.info(f"✅ Orden actualizada: {order.id} -> {existing.status}")
        else:
            model = _order_domain_to_model(order)
            self._session.add(model)
            await self._session.commit()
            await self._session.refresh(model)
            logger.info(f"✅ Nueva orden creada: {order.id}")

        return order

    async def find_by_id(self, order_id: str) -> Optional[Order]:
        stmt = (
            select(OrderModel)
            .options(selectinload(OrderModel.items))
            .where(OrderModel.id == order_id)
        )
        result = await self._session.execute(stmt)
        order = result.scalar_one_or_none()
        if order:
            logger.info(f"🔍 Orden encontrada: {order.id} -> {order.status}")
        else:
            logger.warning(f"⚠️ Orden no encontrada: {order_id}")
        return _order_model_to_domain(order) if order else None

    async def find_by_student(self, student_id: str) -> list[Order]:
        stmt = (
            select(OrderModel)
            .options(selectinload(OrderModel.items))
            .where(OrderModel.student_id == student_id)
            .order_by(OrderModel.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return [_order_model_to_domain(m) for m in result.scalars()]

    async def find_by_status(self, status: OrderStatus) -> list[Order]:
        stmt = (
            select(OrderModel)
            .options(selectinload(OrderModel.items))
            .where(OrderModel.status == status)
        )
        result = await self._session.execute(stmt)
        return [_order_model_to_domain(m) for m in result.scalars()]

    async def find_all_active(self) -> list[Order]:
        """
        KDS: obtiene todas las órdenes activas (recibido, en_preparacion, listo)
        Excluye solo las órdenes entregadas
        """
        stmt = (
            select(OrderModel)
            .options(selectinload(OrderModel.items))
            .where(
                # Comparar contra strings porque la columna es VARCHAR
                OrderModel.status.in_([
                    OrderStatus.RECIBIDO.value,
                    OrderStatus.EN_PREPARACION.value,
                    OrderStatus.LISTO.value,
                ])
            )
            .order_by(
                OrderModel.priority.desc(),
                OrderModel.created_at.asc()
            )
        )
        result = await self._session.execute(stmt)
        orders = [_order_model_to_domain(m) for m in result.scalars()]
        logger.info(f"📊 find_all_active: {len(orders)} órdenes activas")
        for o in orders:
            logger.info(f"   - {o.order_number}: {o.status.value}")
        return orders

    async def generate_order_number(self) -> str:
        stmt = select(func.count()).select_from(OrderModel)
        count = (await self._session.execute(stmt)).scalar_one()
        return f"#A-{count + 1:03d}"