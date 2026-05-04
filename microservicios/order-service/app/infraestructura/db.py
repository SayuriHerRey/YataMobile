"""
INFRAESTRUCTURA - Sesión de base de datos async
Crea la base de datos y tablas automáticamente al arrancar el servicio.
"""
import os
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:sayu12345@localhost:5432/yata_orders"
)

# Credenciales para la conexión directa de asyncpg (crear DB)
_PG_USER     = os.getenv("PG_USER",     "postgres")
_PG_PASSWORD = os.getenv("PG_PASSWORD", "sayu12345")
_PG_HOST     = os.getenv("PG_HOST",     "localhost")
_PG_PORT     = int(os.getenv("PG_PORT", "5432"))

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionFactory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def create_database_if_not_exists() -> None:
    try:
        conn = await asyncpg.connect(
            user=_PG_USER, password=_PG_PASSWORD,
            host=_PG_HOST, port=_PG_PORT, database="postgres",
        )
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = 'yata_orders'"
        )
        if not exists:
            await conn.execute('CREATE DATABASE "yata_orders"')
            print("✅ Base de datos 'yata_orders' creada.")
        else:
            print("ℹ️ Base de datos 'yata_orders' ya existe.")
        await conn.close()
    except Exception as e:
        print(f"⚠️ Error al verificar/crear la DB orders: {e}")
        raise


async def create_tables() -> None:
    from app.infraestructura.adapters.order_repository import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas de orders creadas/verificadas.")


async def init_db() -> None:
    print("🚀 Inicializando base de datos de órdenes...")
    await create_database_if_not_exists()
    await create_tables()
    print("✨ Base de datos de órdenes lista.")


async def get_session() -> AsyncSession:
    async with AsyncSessionFactory() as session:
        yield session
