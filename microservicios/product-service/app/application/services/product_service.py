from typing import List, Optional
from domain.product import Product, IngredientOption, SizeOption, ExtraOption
from application.ports.product_repository import ProductRepository


class ProductService:

    def __init__(self, repository: ProductRepository):
        self.repository = repository

    # ── CREATE ───────────────────────────────────────────────────
    def create_product(
        self,
        name: str,
        description: str,
        base_price: float,
        category: str,
        image_url: str = "",
        available: bool = True,
        requires_customization: bool = False,
        has_extras: bool = False,
        base_ingredients: List[dict] = None,
        available_sizes: List[dict] = None,
        available_extras: List[dict] = None,
    ) -> Product:
        ingredients = [IngredientOption(**i) for i in (base_ingredients or [])]
        sizes = [SizeOption(**s) for s in (available_sizes or [])]
        extras = [ExtraOption(**e) for e in (available_extras or [])]

        product = Product(
            name=name,
            description=description,
            base_price=base_price,
            category=category,
            image_url=image_url,
            available=available,
            requires_customization=requires_customization,
            has_extras=has_extras,
            base_ingredients=ingredients,
            available_sizes=sizes,
            available_extras=extras,
        )
        return self.repository.save(product)

    # ── READ ─────────────────────────────────────────────────────
    def get_product(self, product_id: str) -> Optional[Product]:
        product = self.repository.find_by_id(product_id)
        if not product:
            raise ValueError(f"Producto {product_id} no encontrado")
        return product

    def list_products(self) -> List[Product]:
        return self.repository.find_all()

    def list_available_products(self) -> List[Product]:
        return self.repository.find_available()

    def list_by_category(self, category: str) -> List[Product]:
        return self.repository.find_by_category(category)

    # ── UPDATE ───────────────────────────────────────────────────
    def update_product(self, product_id: str, **kwargs) -> Product:
        product = self.get_product(product_id)
        product.update(**kwargs)
        return self.repository.update(product)

    def toggle_availability(self, product_id: str) -> Product:
        product = self.get_product(product_id)
        product.toggle_availability()
        return self.repository.update(product)

    # ── DELETE ───────────────────────────────────────────────────
    def delete_product(self, product_id: str) -> bool:
        self.get_product(product_id)  # Verifica que existe
        return self.repository.delete(product_id)