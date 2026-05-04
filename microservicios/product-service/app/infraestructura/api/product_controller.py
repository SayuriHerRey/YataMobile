from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from application.services.product_service import ProductService
from infraestructura.adapters.product_repository import PostgresProductRepository

router = APIRouter(prefix="/products", tags=["Products"])
_repo = PostgresProductRepository()
_service = ProductService(_repo)


# ── SCHEMAS ───────────────────────────────────────────────────────────────────

class IngredientSchema(BaseModel):
    id: str
    name: str
    removable: bool = True

class SizeSchema(BaseModel):
    id: str
    name: str
    price: float = 0.0

class ExtraSchema(BaseModel):
    id: str
    name: str
    price: float = 0.0

class ProductCreateRequest(BaseModel):
    name: str
    description: str
    base_price: float
    category: str
    image_url: str = ""
    available: bool = True
    requires_customization: bool = False
    has_extras: bool = False
    base_ingredients: List[IngredientSchema] = []
    available_sizes: List[SizeSchema] = []
    available_extras: List[ExtraSchema] = []

class ProductUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    available: Optional[bool] = None
    requires_customization: Optional[bool] = None
    has_extras: Optional[bool] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    description: str
    base_price: float
    category: str
    image_url: str
    available: bool
    requires_customization: bool
    has_extras: bool
    base_ingredients: List[IngredientSchema]
    available_sizes: List[SizeSchema]
    available_extras: List[ExtraSchema]


def _to_response(product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        base_price=product.base_price,
        category=product.category,
        image_url=product.image_url,
        available=product.available,
        requires_customization=product.requires_customization,
        has_extras=product.has_extras,
        base_ingredients=[IngredientSchema(**vars(i)) for i in product.base_ingredients],
        available_sizes=[SizeSchema(**vars(s)) for s in product.available_sizes],
        available_extras=[ExtraSchema(**vars(e)) for e in product.available_extras],
    )


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductCreateRequest):
    """Staff: crear nuevo producto en el menú."""
    product = _service.create_product(
        name=body.name,
        description=body.description,
        base_price=body.base_price,
        category=body.category,
        image_url=body.image_url,
        available=body.available,
        requires_customization=body.requires_customization,
        has_extras=body.has_extras,
        base_ingredients=[i.model_dump() for i in body.base_ingredients],
        available_sizes=[s.model_dump() for s in body.available_sizes],
        available_extras=[e.model_dump() for e in body.available_extras],
    )
    return _to_response(product)


@router.get("/", response_model=List[ProductResponse])
def list_products(available_only: bool = False, category: Optional[str] = None):
    """Listar productos. Filtros opcionales: disponibles o por categoría."""
    if category:
        products = _service.list_by_category(category)
    elif available_only:
        products = _service.list_available_products()
    else:
        products = _service.list_products()
    return [_to_response(p) for p in products]


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    """Obtener detalle de un producto."""
    try:
        return _to_response(_service.get_product(product_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: str, body: ProductUpdateRequest):
    """Staff: actualizar datos de un producto."""
    try:
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        return _to_response(_service.update_product(product_id, **updates))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{product_id}/toggle", response_model=ProductResponse)
def toggle_availability(product_id: str):
    """Staff: activar/desactivar disponibilidad de un producto."""
    try:
        return _to_response(_service.toggle_availability(product_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: str):
    """Staff: eliminar producto del menú."""
    try:
        _service.delete_product(product_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))