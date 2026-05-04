from typing import List, Optional
import psycopg2
import psycopg2.extras
import os

from application.ports.payment_repository import PaymentRepository
from domain.payment import Payment, PaymentMethod, PaymentStatus

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:sayu12345@localhost:5432/yata_payments"
)


def _get_conn():
    return psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)


def _row_to_payment(row: dict) -> Payment:
    return Payment(
        id=str(row["id"]),
        order_id=str(row["order_id"]),
        user_id=str(row["user_id"]),
        amount=float(row["amount"]),
        method=PaymentMethod(row["method"]),
        status=PaymentStatus(row["status"]),
        card_last4=row.get("card_last4"),
        card_holder=row.get("card_holder"),
        generate_receipt=row["generate_receipt"],
        gateway_reference=row.get("gateway_reference"),
        failure_reason=row.get("failure_reason"),
    )


class PostgresPaymentRepository(PaymentRepository):

    def save(self, payment: Payment) -> Payment:
        sql = """
            INSERT INTO payments (
                id, order_id, user_id, amount, method, status,
                card_last4, card_holder, generate_receipt,
                gateway_reference, failure_reason
            ) VALUES (
                %(id)s, %(order_id)s, %(user_id)s, %(amount)s, %(method)s, %(status)s,
                %(card_last4)s, %(card_holder)s, %(generate_receipt)s,
                %(gateway_reference)s, %(failure_reason)s
            ) RETURNING *
        """
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql, {
                "id": payment.id,
                "order_id": payment.order_id,
                "user_id": payment.user_id,
                "amount": payment.amount,
                "method": payment.method.value,
                "status": payment.status.value,
                "card_last4": payment.card_last4,
                "card_holder": payment.card_holder,
                "generate_receipt": payment.generate_receipt,
                "gateway_reference": payment.gateway_reference,
                "failure_reason": payment.failure_reason,
            })
            conn.commit()
            return _row_to_payment(dict(cur.fetchone()))

    def find_by_id(self, payment_id: str) -> Optional[Payment]:
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT * FROM payments WHERE id = %s", (payment_id,))
            row = cur.fetchone()
            return _row_to_payment(dict(row)) if row else None

    def find_by_order(self, order_id: str) -> Optional[Payment]:
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT * FROM payments WHERE order_id = %s LIMIT 1", (order_id,))
            row = cur.fetchone()
            return _row_to_payment(dict(row)) if row else None

    def find_by_user(self, user_id: str) -> List[Payment]:
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM payments WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,)
            )
            return [_row_to_payment(dict(r)) for r in cur.fetchall()]

    def update(self, payment: Payment) -> Payment:
        sql = """
            UPDATE payments SET
                status = %(status)s,
                gateway_reference = %(gateway_reference)s,
                failure_reason = %(failure_reason)s
            WHERE id = %(id)s RETURNING *
        """
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql, {
                "id": payment.id,
                "status": payment.status.value,
                "gateway_reference": payment.gateway_reference,
                "failure_reason": payment.failure_reason,
            })
            conn.commit()
            return _row_to_payment(dict(cur.fetchone()))