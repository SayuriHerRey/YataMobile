# ✅ FIX: modelos alineados con las tablas reales creadas por order-service
# (yata_orders DB → tablas: orders, order_items)
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey
from app.infraestructura.db import Base


class OrderTable(Base):
    __tablename__ = "orders"
    id             = Column(String(36), primary_key=True)
    order_number   = Column(String(20))
    student_id     = Column(String(36))
    payment_method = Column(String(20))
    status         = Column(String(20))   # recibido | en_preparacion | listo | entregado
    total          = Column(Float)        # ✅ columna real (no total_price)
    priority       = Column(Boolean)
    generate_receipt = Column(Boolean)
    special_instructions = Column(Text, nullable=True)
    created_at     = Column(DateTime)
    started_at     = Column(DateTime, nullable=True)
    finished_at    = Column(DateTime, nullable=True)  # ✅ (no ready_at)


class OrderItemTable(Base):
    __tablename__ = "order_items"
    id         = Column(String(36), primary_key=True)
    order_id   = Column(String(36), ForeignKey("orders.id"))
    product_id = Column(String(36))
    name       = Column(String(150))    # ✅ (no product_name)
    quantity   = Column(Integer)
    unit_price = Column(Float)          # ✅ (no price)
    done       = Column(Boolean)
