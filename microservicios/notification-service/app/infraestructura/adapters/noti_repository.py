"""
INFRAESTRUCTURA - Adaptador PostgreSQL para notificaciones
Implementa NotiRepository y DeviceTokenRepository con SQLAlchemy async.
"""
import json
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String, Boolean, DateTime, Text, Integer,
    Enum as SAEnum, select, func, update
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.noti import (
    Notification, DeviceToken,
    NotificationType, NotificationStatus
)
from app.application.ports.noti_repository import NotiRepository, DeviceTokenRepository


# ── Modelos SQLAlchemy ─────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


class NotificationModel(Base):
    __tablename__ = "notifications"

    id: Mapped[str]      = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    type: Mapped[NotificationType]     = mapped_column(SAEnum(NotificationType), nullable=False)
    title: Mapped[str]   = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        SAEnum(NotificationStatus), nullable=False, default=NotificationStatus.PENDING
    )
    is_read: Mapped[bool]    = mapped_column(Boolean, default=False)
    extra_data: Mapped[str]  = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class DeviceTokenModel(Base):
    __tablename__ = "device_tokens"

    id: Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str]      = mapped_column(String(36), nullable=False, index=True)
    expo_token: Mapped[str]   = mapped_column(String(200), unique=True, nullable=False)
    is_active: Mapped[bool]   = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Mapeadores ─────────────────────────────────────────────────────────────
def _noti_model_to_domain(m: NotificationModel) -> Notification:
    try:
        extra_data = json.loads(m.extra_data or "{}")
    except (json.JSONDecodeError, TypeError):
        extra_data = {}

    return Notification(
        id=m.id,
        user_id=m.user_id,
        type=m.type,
        title=m.title,
        message=m.message,
        status=m.status,
        is_read=m.is_read,
        extra_data=extra_data,
        created_at=m.created_at,
        sent_at=m.sent_at,
    )


# ── Repositorio de Notificaciones ──────────────────────────────────────────
class PostgresNotiRepository(NotiRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, noti: Notification) -> Notification:
        existing = await self._session.get(NotificationModel, noti.id)
        
        if existing:
            # Actualizar existente
            existing.status = noti.status
            existing.is_read = noti.is_read
            existing.sent_at = noti.sent_at
            existing.extra_data = json.dumps(noti.extra_data)
        else:
            # Crear nuevo
            model = NotificationModel(
                id=noti.id,
                user_id=noti.user_id,
                type=noti.type,
                title=noti.title,
                message=noti.message,
                status=noti.status,
                is_read=noti.is_read,
                extra_data=json.dumps(noti.extra_data),
                created_at=noti.created_at,
                sent_at=noti.sent_at,
            )
            self._session.add(model)

        await self._session.commit()
        return noti

    async def find_by_id(self, noti_id: str) -> Optional[Notification]:
        result = await self._session.get(NotificationModel, noti_id)
        return _noti_model_to_domain(result) if result else None

    async def find_by_user(self, user_id: str, limit: int = 20) -> List[Notification]:
        stmt = (
            select(NotificationModel)
            .where(NotificationModel.user_id == user_id)
            .order_by(NotificationModel.created_at.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return [_noti_model_to_domain(m) for m in result.scalars()]

    async def count_unread(self, user_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(NotificationModel)
            .where(
                NotificationModel.user_id == user_id,
                NotificationModel.is_read == False,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one() or 0

    async def mark_all_read(self, user_id: str) -> None:
        stmt = (
            update(NotificationModel)
            .where(
                NotificationModel.user_id == user_id,
                NotificationModel.is_read == False,
            )
            .values(is_read=True)
        )
        await self._session.execute(stmt)
        await self._session.commit()


# ── Repositorio de Tokens ──────────────────────────────────────────────────
class PostgresDeviceTokenRepository(DeviceTokenRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save_token(self, token: DeviceToken) -> DeviceToken:
        stmt = select(DeviceTokenModel).where(
            DeviceTokenModel.expo_token == token.expo_token
        )
        result = await self._session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            existing.is_active = True
            existing.user_id = token.user_id
            existing.updated_at = datetime.utcnow()
        else:
            self._session.add(DeviceTokenModel(
                user_id=token.user_id,
                expo_token=token.expo_token,
                is_active=True,
                created_at=token.created_at,
                updated_at=token.updated_at,
            ))

        await self._session.commit()
        return token

    async def find_by_user(self, user_id: str) -> List[DeviceToken]:
        stmt = select(DeviceTokenModel).where(
            DeviceTokenModel.user_id == user_id,
            DeviceTokenModel.is_active == True,
        )
        result = await self._session.execute(stmt)
        return [
            DeviceToken(
                user_id=m.user_id,
                expo_token=m.expo_token,
                is_active=m.is_active,
                created_at=m.created_at,
                updated_at=m.updated_at,
            )
            for m in result.scalars()
        ]

    async def deactivate_token(self, expo_token: str) -> None:
        stmt = (
            update(DeviceTokenModel)
            .where(DeviceTokenModel.expo_token == expo_token)
            .values(is_active=False, updated_at=datetime.utcnow())
        )
        await self._session.execute(stmt)
        await self._session.commit()