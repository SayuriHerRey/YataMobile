import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infraestructura.api.payment_controller import router as payment_router
from infraestructura.db import init_db


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
    init_db()


@app.get("/health")
def health():
    return {"service": "payment-service", "status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)

