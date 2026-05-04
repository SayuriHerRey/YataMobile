from enum import Enum
from pydantic import BaseModel
from typing import Optional


class Role(str, Enum):
    student = "student"
    staff = "staff"


class LoginRequest(BaseModel):
    email: str
    password: str


# ✅ CORREGIDO: incluye user_id, name y email para que el frontend pueda
#    guardar la sesión completa sin llamadas extra
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    role: Role
    user_id: str
    name: str
    email: str


class User:
    def __init__(self, id: str, email: str, name: str, hashed_password: str):
        self.id = id
        self.email = email
        self.name = name
        self.hashed_password = hashed_password
