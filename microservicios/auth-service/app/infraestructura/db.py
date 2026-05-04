import os
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Usa variable de entorno o valor por defecto (ajusta user/password/host a tu entorno)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:sayu12345@localhost:5432/yata_auth"
)

# ─── Auto-crear la base de datos si no existe ────────────────────────────────
def _create_database_if_not_exists():
    """Se conecta a 'postgres' (DB por defecto) y crea yata_auth si no existe."""
    import re
    match = re.match(
        r"postgresql://(?P<user>[^:]+):(?P<password>[^@]+)@(?P<host>[^:/]+):?(?P<port>\d+)?/(?P<dbname>.+)",
        DATABASE_URL,
    )
    if not match:
        return
    user     = match.group("user")
    password = match.group("password")
    host     = match.group("host")
    port     = int(match.group("port") or 5432)
    dbname   = match.group("dbname")

    try:
        conn = psycopg2.connect(
            user=user, password=password, host=host, port=port, database="postgres"
        )
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{dbname}'")
        exists = cur.fetchone()
        if not exists:
            cur.execute(f'CREATE DATABASE "{dbname}"')
            print(f"✅ Base de datos '{dbname}' creada.")
        else:
            print(f"ℹ️ Base de datos '{dbname}' ya existe.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"⚠️  Error creando DB: {e}")

_create_database_if_not_exists()

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
