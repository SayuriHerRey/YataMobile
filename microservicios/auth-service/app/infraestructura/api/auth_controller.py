from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.domain.auth import LoginRequest, TokenResponse
from app.application.services.auth_service import AuthService
from app.infraestructura.adapters.auth_repository import AuthRepositoryPostgres
from app.infraestructura.db import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


def get_auth_service(db=Depends(get_db)) -> AuthService:
    repo = AuthRepositoryPostgres(db)
    return AuthService(repo)


@router.post("/register", status_code=201)
def register(request: RegisterRequest, service: AuthService = Depends(get_auth_service)):
    """Registrar un nuevo usuario (estudiante o staff según dominio del correo)."""
    return service.register_user(request.email, request.password, request.name)


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, service: AuthService = Depends(get_auth_service)):
    """Autenticar usuario y retornar tokens JWT."""
    return service.authenticate_user(request.email, request.password)


@router.post("/logout")
def logout(refresh_token: str, service: AuthService = Depends(get_auth_service)):
    service.logout(refresh_token)
    return {"message": "Sesión cerrada correctamente"}
