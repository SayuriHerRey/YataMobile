from dataclasses import dataclass, field
from typing import Optional
from uuid import uuid4
from enum import Enum


class PaymentMethod(str, Enum):
    CARD = "card"
    CASH = "cash"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


@dataclass
class Payment:
    order_id: str
    user_id: str
    amount: float
    method: PaymentMethod
    status: PaymentStatus = PaymentStatus.PENDING
    # Solo para tarjeta (últimos 4 dígitos, nunca número completo)
    card_last4: Optional[str] = None
    card_holder: Optional[str] = None
    generate_receipt: bool = True
    # Referencia externa del gateway (Stripe/Conekta)
    gateway_reference: Optional[str] = None
    failure_reason: Optional[str] = None
    id: Optional[str] = field(default_factory=lambda: str(uuid4()))

    def mark_completed(self, gateway_ref: Optional[str] = None) -> None:
        self.status = PaymentStatus.COMPLETED
        if gateway_ref:
            self.gateway_reference = gateway_ref

    def mark_failed(self, reason: str) -> None:
        self.status = PaymentStatus.FAILED
        self.failure_reason = reason

    def refund(self) -> None:
        if self.status != PaymentStatus.COMPLETED:
            raise ValueError("Solo se pueden reembolsar pagos completados")
        self.status = PaymentStatus.REFUNDED