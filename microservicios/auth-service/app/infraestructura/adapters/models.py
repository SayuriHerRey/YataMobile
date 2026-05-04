from sqlalchemy import Column, String, DateTime
from app.infraestructura.db import Base
import uuid

class UserTable(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)

class UserSessionTable(Base):
    __tablename__ = "user_sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String)
    refresh_token = Column(String, index=True)