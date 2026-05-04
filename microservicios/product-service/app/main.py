import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import psycopg2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infraestructura.api.product_controller import router as product_router

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:sayu12345@localhost:5432/yata_products"
)


def _create_db_if_not_exists():
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
        print(f"⚠️  Error creando DB products: {e}")


def init_db():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id                     VARCHAR(36) PRIMARY KEY,
            name                   VARCHAR(255) NOT NULL,
            description            TEXT DEFAULT '',
            base_price             NUMERIC(10,2) NOT NULL,
            category               VARCHAR(100) NOT NULL,
            image_url              TEXT DEFAULT '',
            available              BOOLEAN DEFAULT TRUE,
            requires_customization BOOLEAN DEFAULT FALSE,
            has_extras             BOOLEAN DEFAULT FALSE,
            base_ingredients       JSONB DEFAULT '[]'::jsonb,
            available_sizes        JSONB DEFAULT '[]'::jsonb,
            available_extras       JSONB DEFAULT '[]'::jsonb,
            created_at             TIMESTAMP DEFAULT NOW(),
            updated_at             TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("✅ Tabla 'products' lista.")


app = FastAPI(
    title="Product & Menu Service",
    description="Microservicio de gestión de productos/menú — Yata 2.0",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(product_router)


@app.on_event("startup")
def startup():
    _create_db_if_not_exists()
    init_db()


@app.get("/health")
def health():
    return {"service": "product-service", "status": "ok"}


if __name__ == "__main__":
    import uvicorn
    # ✅ Puerto 8002 — consistente con config.ts del frontend
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
