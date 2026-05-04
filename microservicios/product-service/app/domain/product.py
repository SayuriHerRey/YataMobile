from dataclasses import dataclass, field
from typing import List, Optional
from uuid import uuid4


@dataclass
class IngredientOption:
    id: str
    name: str
    removable: bool = True


@dataclass
class SizeOption:
    id: str
    name: str
    price: float = 0.0


@dataclass
class ExtraOption:
    id: str
    name: str
    price: float = 0.0


@dataclass
class Product:
    name: str
    description: str
    base_price: float
    category: str
    image_url: str = ""
    available: bool = True
    requires_customization: bool = False
    has_extras: bool = False
    base_ingredients: List[IngredientOption] = field(default_factory=list)
    available_sizes: List[SizeOption] = field(default_factory=list)
    available_extras: List[ExtraOption] = field(default_factory=list)
    id: Optional[str] = field(default_factory=lambda: str(uuid4()))

    def toggle_availability(self) -> None:
        self.available = not self.available

    def update(self, **kwargs) -> None:
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)