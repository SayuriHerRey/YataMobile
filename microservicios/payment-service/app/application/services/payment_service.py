from typing import Optional, List
from domain.payment import Payment, PaymentMethod, PaymentStatus
from application.ports.payment_repository import PaymentRepository


class PaymentService:

    def __init__(self, repository: PaymentRepository):
        self.repository = repository

    # ── PROCESAR PAGO ────────────────────────────────────────────
    def process_payment(
        self,
        order_id: str,
        user_id: str,
        amount: float,
        method: str,
        generate_receipt: bool = True,
        card_last4: Optional[str] = None,
        card_holder: Optional[str] = None,
    ) -> Payment:
        payment_method = PaymentMethod(method)

        payment = Payment(
            order_id=order_id,
            user_id=user_id,
            amount=amount,
            method=payment_method,
            generate_receipt=generate_receipt,
            card_last4=card_last4,
            card_holder=card_holder,
        )
        payment = self.repository.save(payment)

        if payment_method == PaymentMethod.CASH:
            # Efectivo: queda pendiente hasta que confirmen en caja
            return payment

        # Tarjeta: llamar al gateway (simulado aquí, reemplazar con Stripe/Conekta)
        try:
            gateway_ref = self._charge_card(amount, card_last4)
            payment.mark_completed(gateway_ref)
        except Exception as exc:
            payment.mark_failed(str(exc))

        return self.repository.update(payment)

    def _charge_card(self, amount: float, card_last4: str) -> str:
        """
        Aquí se integraría Stripe o Conekta.
        Por ahora simula una transacción exitosa.
        """
        import uuid
        # TODO: stripe.PaymentIntent.create(amount=int(amount*100), currency="mxn", ...)
        return f"sim_{uuid.uuid4().hex[:12]}"

    # ── CONFIRMAR EFECTIVO ───────────────────────────────────────
    def confirm_cash_payment(self, payment_id: str) -> Payment:
        """Staff confirma que el cliente pagó en caja."""
        payment = self._get_or_raise(payment_id)
        if payment.method != PaymentMethod.CASH:
            raise ValueError("Este pago no es en efectivo")
        payment.mark_completed()
        return self.repository.update(payment)

    # ── REEMBOLSO ────────────────────────────────────────────────
    def refund_payment(self, payment_id: str) -> Payment:
        payment = self._get_or_raise(payment_id)
        payment.refund()
        return self.repository.update(payment)

    # ── CONSULTAS ────────────────────────────────────────────────
    def get_payment(self, payment_id: str) -> Payment:
        return self._get_or_raise(payment_id)

    def get_payment_by_order(self, order_id: str) -> Optional[Payment]:
        return self.repository.find_by_order(order_id)

    def get_user_history(self, user_id: str) -> List[Payment]:
        return self.repository.find_by_user(user_id)

    # ── HELPERS ──────────────────────────────────────────────────
    def _get_or_raise(self, payment_id: str) -> Payment:
        payment = self.repository.find_by_id(payment_id)
        if not payment:
            raise ValueError(f"Pago {payment_id} no encontrado")
        return payment