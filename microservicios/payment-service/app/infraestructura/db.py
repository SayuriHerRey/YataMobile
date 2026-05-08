"""
INFRAESTRUCTURA - Conexión a base de datos para payment-service.

Usa psycopg2 directo (igual que el resto del servicio).
Crea la DB yata_payments y la tabla payments si no existen.
"""
import os
import re
import psycopg2

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:sayu12345@localhost:5432/yata_payments"
)


def _parse_url(url: str) -> dict:
    match = re.match(
        r"postgresql://(?P<user>[^:]+):(?P<password>[^@]+)@(?P<host>[^:/]+):?(?P<port>\d+)?/(?P<dbname>.+)",
        url,
    )
    if not match:
        raise ValueError(f"DATABASE_URL inválida: {url}")
    return {
        "user": match.group("user"),
        "password": match.group("password"),
        "host": match.group("host"),
        "port": int(match.group("port") or 5432),
        "dbname": match.group("dbname"),
    }


def create_database_if_not_exists() -> None:
    """Crea la base de datos yata_payments si no existe."""
    params = _parse_url(DB_URL)
    try:
        conn = psycopg2.connect(
            user=params["user"],
            password=params["password"],
            host=params["host"],
            port=params["port"],
            database="postgres",
        )
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (params["dbname"],)
        )
        if not cur.fetchone():
            cur.execute(f'CREATE DATABASE "{params["dbname"]}"')
            print(f"✅ Base de datos '{params['dbname']}' creada.")
        else:
            print(f"ℹ️  Base de datos '{params['dbname']}' ya existe.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"⚠️  Error verificando/creando DB payments: {e}")
        raise


def create_tables() -> None:
    """Crea la tabla payments e índices si no existen."""
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id                  VARCHAR(36) PRIMARY KEY,
            order_id            VARCHAR(36) NOT NULL,
            user_id             VARCHAR(36) NOT NULL,
            amount              NUMERIC(10,2) NOT NULL,
            method              VARCHAR(10) NOT NULL CHECK (method IN ('card','cash')),
            status              VARCHAR(15) NOT NULL DEFAULT 'pending',
            card_last4          VARCHAR(4),
            card_holder         VARCHAR(255),
            generate_receipt    BOOLEAN DEFAULT TRUE,
            gateway_reference   VARCHAR(255),
            failure_reason      TEXT,
            created_at          TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
        CREATE INDEX IF NOT EXISTS idx_payments_user  ON payments(user_id);
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("✅ Tabla 'payments' lista.")


def init_db() -> None:
    """Inicializa base de datos completa."""
    print("🚀 Inicializando base de datos de payments...")
    create_database_if_not_exists()
    create_tables()
    print("✨ Base de datos de payments lista.")


def get_connection():
    """Retorna una conexión psycopg2 a yata_payments."""
    return psycopg2.connect(DB_URL)
