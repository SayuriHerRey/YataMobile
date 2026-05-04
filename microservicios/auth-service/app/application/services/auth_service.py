from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from fastapi import HTTPException
from app.domain.auth import Role, TokenResponse
from app.application.ports.auth_repository import AuthRepository

SECRET_KEY = "yata_super_secret_key_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository

    def detect_role_by_domain(self, email: str) -> Role:
        email_lower = email.lower()
        if "@unach.mx" in email_lower:
            return Role.student
        elif "@cafeteria.com" in email_lower or "@staff.unach.mx" in email_lower:
            return Role.staff
        raise HTTPException(status_code=400, detail="Dominio de correo no válido. Usa @unach.mx o @cafeteria.com")

    def register_user(self, email: str, password: str, name: str) -> dict:
        """Registrar un nuevo usuario."""
        # Verificar que el dominio es válido
        self.detect_role_by_domain(email)

        # Verificar que no existe ya
        existing = self.repository.get_user_by_email(email)
        if existing:
            raise HTTPException(status_code=409, detail="Ya existe una cuenta con este correo")

        hashed = pwd_context.hash(password)
        self.repository.create_user(email=email, name=name, hashed_password=hashed)
        return {"message": "Usuario registrado correctamente"}

    def authenticate_user(self, email: str, password: str) -> TokenResponse:
        user = self.repository.get_user_by_email(email)
        if not user or not pwd_context.verify(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

        role = self.detect_role_by_domain(email)

        access_token = self._create_token(
            {"sub": user.id, "email": user.email, "name": user.name, "role": role.value},
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        refresh_token = self._create_token(
            {"sub": user.id, "type": "refresh"},
            timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )

        self.repository.save_refresh_token(user.id, refresh_token)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            role=role,
            user_id=user.id,
            name=user.name,
            email=user.email,
        )

    def logout(self, refresh_token: str):
        self.repository.revoke_token(refresh_token)

    def _create_token(self, data: dict, expires_delta: timedelta):
        to_encode = data.copy()
        expire = datetime.utcnow() + expires_delta
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
