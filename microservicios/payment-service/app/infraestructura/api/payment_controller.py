from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from application.services.payment_service import PaymentService
from infraestructura.adapters.payment_repository import PostgresPaymentRepository

router = APIRouter(prefix="/payments", tags=["Payments"])
_repo = PostgresPaymentRepository()
_service = PaymentService(_repo)


# ── SCHEMAS ───────────────────────────────────────────────────────────────────

class ProcessPaymentRequest(BaseModel):
    order_id: str
    user_id: str
    amount: float
    method: str                    # "card" | "cash"
    generate_receipt: bool = True
    card_last4: Optional[str] = None
    card_holder: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    order_id: str
    user_id: str
    amount: float
    method: str
    status: str
    card_last4: Optional[str]
    generate_receipt: bool
    gateway_reference: Optional[str]
    failure_reason: Optional[str]


def _to_response(p) -> PaymentResponse:
    return PaymentResponse(
        id=p.id,
        order_id=p.order_id,
        user_id=p.user_id,
        amount=p.amount,
        method=p.method.value,
        status=p.status.value,
        card_last4=p.card_last4,
        generate_receipt=p.generate_receipt,
        gateway_reference=p.gateway_reference,
        failure_reason=p.failure_reason,
    )


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def process_payment(body: ProcessPaymentRequest):
    """
    Procesar un pago.
    - method='card': cobra via gateway y retorna status completed/failed.
    - method='cash': queda en pending hasta confirmar en caja.
    """
    try:
        payment = _service.process_payment(
            order_id=body.order_id,
            user_id=body.user_id,
            amount=body.amount,
            method=body.method,
            generate_receipt=body.generate_receipt,
            card_last4=body.card_last4,
            card_holder=body.card_holder,
        )
        return _to_response(payment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: str):
    """Consultar detalle de un pago."""
    try:
        return _to_response(_service.get_payment(payment_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/order/{order_id}", response_model=PaymentResponse)
def get_payment_by_order(order_id: str):
    """Obtener el pago asociado a una orden."""
    payment = _service.get_payment_by_order(order_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado para esta orden")
    return _to_response(payment)


@router.get("/user/{user_id}/history", response_model=List[PaymentResponse])
def get_user_history(user_id: str):
    """Historial de pagos de un usuario."""
    return [_to_response(p) for p in _service.get_user_history(user_id)]


@router.patch("/{payment_id}/confirm-cash", response_model=PaymentResponse)
def confirm_cash(payment_id: str):
    """Staff: confirmar que el cliente pagó en efectivo en caja."""
    try:
        return _to_response(_service.confirm_cash_payment(payment_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{payment_id}/refund", response_model=PaymentResponse)
def refund_payment(payment_id: str):
    """Reembolsar un pago completado."""
    try:
        return _to_response(_service.refund_payment(payment_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))