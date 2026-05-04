"""
INFRAESTRUCTURA - Sesión de base de datos async
Crea la base de datos y tablas automáticamente al arrancar el servicio.
"""
import os
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:sayu12345@localhost:5432/yata_notifications"
)

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionFactory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def create_database_if_not_exists() -> None:
    try:
        conn = await asyncpg.connect(
            user="postgres",
            password="sayu12345",
            host="localhost",
            port=5432,
            database="postgres",
        )
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = 'yata_notifications'"
        )
        if not exists:
            await conn.execute('CREATE DATABASE "yata_notifications"')
            print("✅ Base de datos 'yata_notifications' creada.")
        else:
            print("ℹ️ Base de datos 'yata_notifications' ya existe.")
        await conn.close()
    except Exception as e:
        print(f"⚠️ Error al verificar/crear la DB: {e}")
        raise


async def create_tables() -> None:
    """Crea todas las tablas definidas en los modelos SQLAlchemy."""
    from app.infraestructura.adapters.noti_repository import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas de notifications creadas/verificadas.")


async def init_db() -> None:
    """Inicializa base de datos completa."""
    print("🚀 Inicializando base de datos de notificaciones...")
    await create_database_if_not_exists()
    await create_tables()
    print("✨ Base de datos de notificaciones lista.")


async def get_session() -> AsyncSession:
    async with AsyncSessionFactory() as session:
        yield session