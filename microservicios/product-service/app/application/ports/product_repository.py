from abc import ABC, abstractmethod
from typing import List, Optional
from domain.product import Product


class ProductRepository(ABC):

    @abstractmethod
    def save(self, product: Product) -> Product:
        pass

    @abstractmethod
    def find_by_id(self, product_id: str) -> Optional[Product]:
        pass

    @abstractmethod
    def find_all(self) -> List[Product]:
        pass

    @abstractmethod
    def find_by_category(self, category: str) -> List[Product]:
        pass

    @abstractmethod
    def find_available(self) -> List[Product]:
        pass

    @abstractmethod
    def update(self, product: Product) -> Product:
        pass

    @abstractmethod
    def delete(self, product_id: str) -> bool:
        pass