"""
INFRAESTRUCTURA - API Controller (FastAPI)
✅ FIX: Rutas con segmentos fijos (/active, /student/{id}) declaradas
        ANTES que la ruta dinámica /{order_id} para evitar conflictos.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services.order_service import (
    OrderService, CreateOrderDTO, CreateOrderItemDTO, ItemCustomizationDTO
)
from app.infraestructura.adapters.order_repository import PostgresOrderRepository
from app.infraestructura.adapters.notification_adapter import HttpNotificationAdapter
from app.infraestructura.db import get_session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])


# ── Schemas ────────────────────────────────────────────────────────────────
class CustomizationSchema(BaseModel):
    size_name: Optional[str] = None
    size_price: float = 0.0
    removed_ingredients: list[str] = []
    added_extras: list[str] = []
    special_instructions: Optional[str] = None


class OrderItemSchema(BaseModel):
    product_id: str
    name: str
    quantity: int
    unit_price: float
    customization: Optional[CustomizationSchema] = None


class CreateOrderRequest(BaseModel):
    student_id: str
    items: list[OrderItemSchema]
    payment_method: str
    special_instructions: Optional[str] = None
    generate_receipt: bool = True
    priority: bool = False


# ── Dependencia ────────────────────────────────────────────────────────────
def get_order_service(session: AsyncSession = Depends(get_session)) -> OrderService:
    repo     = PostgresOrderRepository(session)
    notifier = HttpNotificationAdapter()
    return OrderService(repo=repo, notifier=notifier)


# ── Endpoints — RUTAS FIJAS PRIMERO ───────────────────────────────────────

# POST /orders/
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_order(
    body: CreateOrderRequest,
    svc: OrderService = Depends(get_order_service),
):
    try:
        dto = CreateOrderDTO(
            student_id=body.student_id,
            items=[
                CreateOrderItemDTO(
                    product_id=i.product_id,
                    name=i.name,
                    quantity=i.quantity,
                    unit_price=i.unit_price,
                    customization=ItemCustomizationDTO(
                        size_name=i.customization.size_name,
                        size_price=i.customization.size_price,
                        removed_ingredients=i.customization.removed_ingredients,
                        added_extras=i.customization.added_extras,
                        special_instructions=i.customization.special_instructions,
                    ) if i.customization else None,
                )
                for i in body.items
            ],
            payment_method=body.payment_method,
            special_instructions=body.special_instructions,
            generate_receipt=body.generate_receipt,
            priority=body.priority,
        )
        return await svc.create_order(dto)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ✅ GET /orders/active — DEBE ir ANTES de /{order_id}
@router.get("/active")
async def get_active_orders(svc: OrderService = Depends(get_order_service)):
    orders = await svc.get_active_orders()
    logger.info(f"📦 GET /active - Retornando {len(orders)} órdenes")
    return orders


# ✅ GET /orders/student/{student_id} — DEBE ir ANTES de /{order_id}
@router.get("/student/{student_id}")
async def get_student_history(
    student_id: str,
    svc: OrderService = Depends(get_order_service),
):
    return await svc.get_student_history(student_id)


# ── Rutas dinámicas AL FINAL ───────────────────────────────────────────────

# GET /orders/{order_id}
@router.get("/{order_id}")
async def get_order(order_id: str, svc: OrderService = Depends(get_order_service)):
    try:
        return await svc.get_order_status(order_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# PATCH /orders/{order_id}/start
@router.patch("/{order_id}/start")
async def start_preparation(order_id: str, svc: OrderService = Depends(get_order_service)):
    try:
        logger.info(f"🚀 Iniciando preparación: {order_id}")
        result = await svc.start_preparation(order_id)
        logger.info(f"✅ Preparación iniciada: {result.order_number} -> {result.status}")
        return result
    except ValueError as e:
        logger.error(f"❌ Error al iniciar preparación: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# PATCH /orders/{order_id}/items/{item_id}/done
@router.patch("/{order_id}/items/{item_id}/done")
async def mark_item_done(
    order_id: str,
    item_id: str,
    svc: OrderService = Depends(get_order_service),
):
    try:
        logger.info(f"✅ Marcando item como done: {order_id} / {item_id}")
        return await svc.mark_item_done(order_id, item_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# PATCH /orders/{order_id}/ready
@router.patch("/{order_id}/ready")
async def mark_order_ready(order_id: str, svc: OrderService = Depends(get_order_service)):
    try:
        logger.info(f"🎯 Marcando orden como lista: {order_id}")
        result = await svc.mark_order_ready(order_id)
        logger.info(f"✅ Orden lista: {result.order_number} -> {result.status}")
        return result
    except ValueError as e:
        logger.error(f"❌ Error al marcar lista: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# PATCH /orders/{order_id}/deliver
@router.patch("/{order_id}/deliver")
async def mark_order_delivered(order_id: str, svc: OrderService = Depends(get_order_service)):
    try:
        logger.info(f"📦 Marcando orden como entregada: {order_id}")
        result = await svc.mark_order_delivered(order_id)
        logger.info(f"✅ Orden entregada: {result.order_number} -> {result.status}")
        return result
    except ValueError as e:
        logger.error(f"❌ Error al marcar entregada: {e}")
        raise HTTPException(status_code=400, detail=str(e))
