"""
ENTRY POINT - Order Service
agrega CORS middleware para que el frontend React Native pueda conectarse.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.infraestructura.api.order_controller import router as order_router
from app.infraestructura.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Iniciando Order Service...")
    await init_db()
    print("✅ Order Service listo.")
    yield
    print("🛑 Order Service detenido.")


app = FastAPI(
    title="YaTa - Order Service",
    description="Gestiona el ciclo completo de pedidos: creación, KDS y seguimiento.",
    version="1.0.0",
    lifespan=lifespan,
)

# ✅ CORS — obligatorio para React Native / Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(order_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "order-service"}
