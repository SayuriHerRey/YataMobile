"""
ENTRY POINT - Notification Service
✅ CORREGIDO: agrega CORS y corrige DATABASE_URL consistente con otros servicios.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.infraestructura.api.noti_controller import router as noti_router
from app.infraestructura.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Iniciando Notification Service...")
    await init_db()
    print("✅ Notification Service listo.")
    yield
    print("🛑 Notification Service detenido.")


app = FastAPI(
    title="YaTa - Notification Service",
    description="Gestiona notificaciones push (Expo) e in-app para estudiantes.",
    version="1.0.0",
    lifespan=lifespan,
)

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(noti_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "notification-service"}
