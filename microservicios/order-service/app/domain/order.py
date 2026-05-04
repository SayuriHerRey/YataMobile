"""
DOMINIO - Entidades del Order Service
Refleja exactamente los tipos de KDSScreen.tsx y CarritoScreen.tsx
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


# ── Enums ─────────────────────────────────────────────────────────────────
# Refleja: type OrderStatus = 'pendiente' | 'en_preparacion' | 'listo'  (KDSScreen)
# y:       type OrderStatus = 'recibido'  | 'en_preparacion' | 'listo'  (SeguimientoScreen)
class OrderStatus(str, Enum):
    RECIBIDO       = "recibido"        # Estudiante lo ve como "recibido"
    EN_PREPARACION = "en_preparacion"  # Cocina lo mueve a este estado
    LISTO          = "listo"           # Pedido listo para recoger
    ENTREGADO      = "entregado"       # Pedido entregado al estudiante


# Refleja: type PaymentMethod = 'tarjeta' | 'efectivo'  (KDSScreen)
class PaymentMethod(str, Enum):
    TARJETA  = "tarjeta"
    EFECTIVO = "efectivo"


# ── Value Objects ──────────────────────────────────────────────────────────
@dataclass(frozen=True)
class OrderItemCustomization:
    """
    Refleja ProductCustomization de CarritoScreen:
    size, removedIngredients, addedExtras, specialInstructions
    """
    size_name: Optional[str] = None
    size_price: float = 0.0
    removed_ingredients: tuple = field(default_factory=tuple)
    added_extras: tuple = field(default_factory=tuple)       # ej. ("Extra crema",)
    special_instructions: Optional[str] = None

    def to_display_text(self) -> str:
        parts = []
        if self.size_name and self.size_price > 0:
            parts.append(f"Tamaño: {self.size_name}")
        if self.removed_ingredients:
            parts.append(f"Sin: {', '.join(self.removed_ingredients)}")
        if self.added_extras:
            parts.append(f"Extra: {', '.join(self.added_extras)}")
        if self.special_instructions:
            parts.append(f"Notas: {self.special_instructions}")
        return " | ".join(parts)


# ── Entidades ──────────────────────────────────────────────────────────────
@dataclass
class OrderItem:
    """
    Refleja interface OrderItem de KDSScreen:
    id, name, quantity, customization, specialInstruction, done
    """
    id: str
    product_id: str
    name: str
    quantity: int
    unit_price: float
    customization: Optional[OrderItemCustomization] = None
    done: bool = False          # El staff lo marca cuando ese ítem está listo

    @property
    def subtotal(self) -> float:
        extra = self.customization.size_price if self.customization else 0.0
        return (self.unit_price + extra) * self.quantity


@dataclass
class Order:
    """
    Refleja interface Order de KDSScreen.tsx
    """
    id: str
    order_number: str               # Formato #A-242
    student_id: str
    items: list[OrderItem]
    payment_method: PaymentMethod
    status: OrderStatus
    priority: bool = False
    special_instructions: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None   # Cuando pasa a en_preparacion
    finished_at: Optional[datetime] = None  # Cuando pasa a listo
    generate_receipt: bool = True

    # ── Reglas de negocio ─────────────────────────────────────────────────
    @property
    def total(self) -> float:
        return sum(item.subtotal for item in self.items)

    @property
    def all_items_done(self) -> bool:
        return all(item.done for item in self.items)

    def start_preparation(self) -> None:
        if self.status != OrderStatus.RECIBIDO:
            raise ValueError(f"No se puede iniciar: estado actual es '{self.status}'")
        self.status = OrderStatus.EN_PREPARACION
        self.started_at = datetime.utcnow()

    def mark_as_ready(self) -> None:
        if self.status != OrderStatus.EN_PREPARACION:
            raise ValueError(f"No se puede marcar listo: estado actual es '{self.status}'")
        self.status = OrderStatus.LISTO
        self.finished_at = datetime.utcnow()

    def mark_as_delivered(self) -> None:
        """Marca la orden como entregada"""
        if self.status != OrderStatus.LISTO:
            raise ValueError(f"No se puede entregar: estado actual es '{self.status}'")
        self.status = OrderStatus.ENTREGADO

    def mark_item_done(self, item_id: str) -> None:
        for item in self.items:
            if item.id == item_id:
                item.done = True
                return
        raise ValueError(f"Ítem '{item_id}' no encontrado en la orden")

    def elapsed_minutes(self) -> int:
        return int((datetime.utcnow() - self.created_at).total_seconds() / 60)

    def is_urgent(self) -> bool:
        """Refleja getUrgencyColor de KDSScreen: > 10 min = rojo/urgente."""
        return self.elapsed_minutes() > 10 or self.priority

    def __str__(self) -> str:
        return f"Order({self.order_number}, {self.status.value}, ${self.total:.2f})"