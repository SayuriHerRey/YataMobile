from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.infraestructura.api.analytics_controller import router as analytics_router
from app.infraestructura.db import engine, Base

# Importar modelos para que SQLAlchemy registre las tablas
import app.infraestructura.adapters.models  # noqa: F401

# Crear tablas automáticamente al iniciar
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="YaTa Analytics Service",
    description="Microservicio de Estadísticas para la Cafetería",
    version="1.0.0",
)

# CORS necesario para el frontend móvil
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "analytics-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
