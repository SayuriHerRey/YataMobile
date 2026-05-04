from typing import List, Optional
import psycopg2
import psycopg2.extras
import json
import os

from application.ports.product_repository import ProductRepository
from domain.product import Product, IngredientOption, SizeOption, ExtraOption

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:sayu12345@localhost:5432/yata_products"
)

def _get_conn():
    return psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)


def _row_to_product(row: dict) -> Product:
    return Product(
        id=str(row["id"]),
        name=row["name"],
        description=row["description"],
        base_price=float(row["base_price"]),
        category=row["category"],
        image_url=row.get("image_url", ""),
        available=row["available"],
        requires_customization=row["requires_customization"],
        has_extras=row["has_extras"],
        base_ingredients=[IngredientOption(**i) for i in (row.get("base_ingredients") or [])],
        available_sizes=[SizeOption(**s) for s in (row.get("available_sizes") or [])],
        available_extras=[ExtraOption(**e) for e in (row.get("available_extras") or [])],
    )


class PostgresProductRepository(ProductRepository):

    def save(self, product: Product) -> Product:
        sql = """
            INSERT INTO products (
                id, name, description, base_price, category, image_url,
                available, requires_customization, has_extras,
                base_ingredients, available_sizes, available_extras
            ) VALUES (
                %(id)s, %(name)s, %(description)s, %(base_price)s, %(category)s,
                %(image_url)s, %(available)s, %(requires_customization)s, %(has_extras)s,
                %(base_ingredients)s::jsonb, %(available_sizes)s::jsonb, %(available_extras)s::jsonb
            ) RETURNING *
        """
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql, {
                "id": product.id,
                "name": product.name,
                "description": product.description,
                "base_price": product.base_price,
                "category": product.category,
                "image_url": product.image_url,
                "available": product.available,
                "requires_customization": product.requires_customization,
                "has_extras": product.has_extras,
                "base_ingredients": json.dumps([vars(i) for i in product.base_ingredients]),
                "available_sizes": json.dumps([vars(s) for s in product.available_sizes]),
                "available_extras": json.dumps([vars(e) for e in product.available_extras]),
            })
            conn.commit()
            return _row_to_product(dict(cur.fetchone()))

    def find_by_id(self, product_id: str) -> Optional[Product]:
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT * FROM products WHERE id = %s", (product_id,))
            row = cur.fetchone()
            return _row_to_product(dict(row)) if row else None

    def find_all(self) -> List[Product]:
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT * FROM products ORDER BY name")
            return [_row_to_product(dict(r)) for r in cur.fetchall()]

    def find_by_category(self, category: str) -> List[Product]:
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT * FROM products WHERE category = %s ORDER BY name", (category,))
            return [_row_to_product(dict(r)) for r in cur.fetchall()]

    def find_available(self) -> List[Product]:
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT * FROM products WHERE available = TRUE ORDER BY name")
            return [_row_to_product(dict(r)) for r in cur.fetchall()]

    def update(self, product: Product) -> Product:
        sql = """
            UPDATE products SET
                name = %(name)s, description = %(description)s,
                base_price = %(base_price)s, category = %(category)s,
                image_url = %(image_url)s, available = %(available)s,
                requires_customization = %(requires_customization)s,
                has_extras = %(has_extras)s,
                base_ingredients = %(base_ingredients)s::jsonb,
                available_sizes = %(available_sizes)s::jsonb,
                available_extras = %(available_extras)s::jsonb
            WHERE id = %(id)s RETURNING *
        """
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql, {
                "id": product.id,
                "name": product.name,
                "description": product.description,
                "base_price": product.base_price,
                "category": product.category,
                "image_url": product.image_url,
                "available": product.available,
                "requires_customization": product.requires_customization,
                "has_extras": product.has_extras,
                "base_ingredients": json.dumps([vars(i) for i in product.base_ingredients]),
                "available_sizes": json.dumps([vars(s) for s in product.available_sizes]),
                "available_extras": json.dumps([vars(e) for e in product.available_extras]),
            })
            conn.commit()
            return _row_to_product(dict(cur.fetchone()))

    def delete(self, product_id: str) -> bool:
        with _get_conn() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
            conn.commit()
            return cur.rowcount > 0