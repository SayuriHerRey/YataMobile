import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import psycopg2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infraestructura.api.payment_controller import router as payment_router

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:sayu12345@localhost:5432/yata_payments"
)


def _create_db_if_not_exists():
    """Crea la base yata_payments si no existe."""
    import re
    match = re.match(
        r"postgresql://(?P<user>[^:]+):(?P<password>[^@]+)@(?P<host>[^:/]+):?(?P<port>\d+)?/(?P<dbname>.+)",
        DB_URL,
    )
    if not match:
        return
    try:
        conn = psycopg2.connect(
            user=match.group("user"), password=match.group("password"),
            host=match.group("host"), port=int(match.group("port") or 5432),
            database="postgres"
        )
        conn.autocommit = True
        cur = conn.cursor()
        dbname = match.group("dbname")
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{dbname}'")
        if not cur.fetchone():
            cur.execute(f'CREATE DATABASE "{dbname}"')
            print(f"✅ Base de datos '{dbname}' creada.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"⚠️  Error creando DB payments: {e}")


def init_db():
    """Crea la tabla payments si no existe."""
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


app = FastAPI(
    title="Payment Service",
    description="Microservicio de pagos (tarjeta/efectivo) — Yata 2.0",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payment_router)


@app.on_event("startup")
def startup():
    _create_db_if_not_exists()
    init_db()


@app.get("/health")
def health():
    return {"service": "payment-service", "status": "ok"}


if __name__ == "__main__":
    import uvicorn
    # ✅ Puerto 8003 — consistente con config.ts del frontend
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
