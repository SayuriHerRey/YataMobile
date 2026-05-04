from abc import ABC, abstractmethod
from typing import Optional
from app.domain.auth import User

class AuthRepository(ABC):
    @abstractmethod
    def get_user_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    def save_refresh_token(self, user_id: str, token: str) -> None:
        pass

    @abstractmethod
    def revoke_token(self, token: str) -> None:
        pass