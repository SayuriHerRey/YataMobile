import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.application.ports.auth_repository import AuthRepository
from app.domain.auth import User


class AuthRepositoryPostgres(AuthRepository):
    def __init__(self, db_session: Session):
        self.db = db_session

    def get_user_by_email(self, email: str) -> Optional[User]:
        query = text("SELECT id, email, name, hashed_password FROM users WHERE email = :email")
        result = self.db.execute(query, {"email": email}).fetchone()
        if result:
            return User(id=str(result[0]), email=result[1], name=result[2], hashed_password=result[3])
        return None

    # necesario para el endpoint /register
    def create_user(self, email: str, name: str, hashed_password: str) -> User:
        user_id = str(uuid.uuid4())
        query = text(
            "INSERT INTO users (id, email, name, hashed_password) "
            "VALUES (:id, :email, :name, :hashed_password)"
        )
        self.db.execute(query, {
            "id": user_id,
            "email": email,
            "name": name,
            "hashed_password": hashed_password,
        })
        self.db.commit()
        return User(id=user_id, email=email, name=name, hashed_password=hashed_password)

    def save_refresh_token(self, user_id: str, token: str) -> None:
        query = text(
            "INSERT INTO user_sessions (id, user_id, refresh_token) VALUES (:id, :uid, :tok)"
        )
        self.db.execute(query, {"id": str(uuid.uuid4()), "uid": user_id, "tok": token})
        self.db.commit()

    def revoke_token(self, token: str) -> None:
        query = text("DELETE FROM user_sessions WHERE refresh_token = :tok")
        self.db.execute(query, {"tok": token})
        self.db.commit()
