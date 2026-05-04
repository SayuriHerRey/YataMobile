from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.infraestructura.api.auth_controller import router as auth_router
from app.infraestructura.db import engine, Base
from app.infraestructura.adapters.models import *

# Crear tablas en la DB automáticamente
Base.metadata.create_all(bind=engine)
app = FastAPI(title="YaTa Auth Service", version="1.0.0")

# CORS necesario para que el frontend React Native pueda conectarse
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "auth-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)
