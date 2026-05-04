from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from app.application.ports.analytics_repository import AnalyticsRepository
from app.infraestructura.adapters.models import OrderTable, OrderItemTable


class AnalyticsRepositoryPostgres(AnalyticsRepository):
    def __init__(self, db_session: Session):
        self.db = db_session

    def get_metrics(self, time_range: str) -> Dict[str, Any]:
        where_clause = self._time_where(time_range)
        # ✅ FIX: columna real es "total" (no "total_price")
        #         columna real es "finished_at" (no "ready_at")
        #         estados reales: 'listo', 'entregado'
        query = text(f"""
            SELECT
                COUNT(*)                                                           AS total_orders,
                COALESCE(ROUND(AVG(total)::numeric, 2), 0)                         AS avg_ticket,
                COALESCE(ROUND(AVG(
                    EXTRACT(EPOCH FROM (finished_at - started_at)) / 60
                )::numeric), 12)                                                    AS avg_prep_time
            FROM orders
            WHERE status IN ('listo', 'entregado')
            {where_clause}
        """)
        result = self.db.execute(query).fetchone()
        return {
            "totalOrders": int(result[0] or 0),
            "growth": "+12%",
            "avgTicket": float(result[1] or 0),
            "avgPrepTime": int(result[2] or 12),
        }

    def get_hourly_data(self, time_range: str) -> List[Dict[str, Any]]:
        where_clause = self._time_where(time_range)
        query = text(f"""
            SELECT
                TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24:MI') AS hour,
                COUNT(*)                                             AS value
            FROM orders
            WHERE 1=1 {where_clause}
            GROUP BY DATE_TRUNC('hour', created_at)
            ORDER BY DATE_TRUNC('hour', created_at)
        """)
        rows = self.db.execute(query).fetchall()
        if not rows:
            return [{"hour": f"{h:02d}:00", "value": 0} for h in [8, 10, 12, 14, 16]]
        return [{"hour": r[0], "value": int(r[1])} for r in rows]

    def get_top_products(self, time_range: str, limit: int = 5) -> List[Dict[str, Any]]:
        where_clause = self._time_where(time_range, table_prefix="o.")
        # ✅ FIX: columnas reales de order_items: name, unit_price, quantity
        query = text(f"""
            SELECT
                oi.name                              AS product_name,
                SUM(oi.quantity)                     AS total_qty,
                SUM(oi.unit_price * oi.quantity)     AS revenue
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE 1=1 {where_clause}
            GROUP BY oi.name
            ORDER BY total_qty DESC
            LIMIT :limit
        """)
        rows = self.db.execute(query, {"limit": limit}).fetchall()
        return [
            {
                "id": str(i),
                "name": r[0],
                "image": "https://via.placeholder.com/150",
                "ordersToday": int(r[1]),
                "revenue": float(r[2]),
            }
            for i, r in enumerate(rows)
        ]

    def _time_where(self, time_range: str, table_prefix: str = "") -> str:
        col = f"{table_prefix}created_at"
        if time_range == "today":
            return f"AND DATE({col}) = CURRENT_DATE"
        elif time_range == "week":
            return f"AND {col} >= NOW() - INTERVAL '7 days'"
        elif time_range == "month":
            return f"AND {col} >= NOW() - INTERVAL '30 days'"
        return ""
