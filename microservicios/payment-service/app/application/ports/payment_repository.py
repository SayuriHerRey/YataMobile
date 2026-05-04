from abc import ABC, abstractmethod
from typing import List, Optional
from domain.payment import Payment


class PaymentRepository(ABC):

    @abstractmethod
    def save(self, payment: Payment) -> Payment:
        pass

    @abstractmethod
    def find_by_id(self, payment_id: str) -> Optional[Payment]:
        pass

    @abstractmethod
    def find_by_order(self, order_id: str) -> Optional[Payment]:
        pass

    @abstractmethod
    def find_by_user(self, user_id: str) -> List[Payment]:
        pass

    @abstractmethod
    def update(self, payment: Payment) -> Payment:
        pass