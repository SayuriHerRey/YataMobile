from fastapi import APIRouter, Depends, Query
from typing import List
from app.domain.analytics import DashboardResponse, TopProduct
from app.application.services.analytics_service import AnalyticsService
from app.infraestructura.adapters.analytics_repository import AnalyticsRepositoryPostgres
from app.infraestructura.db import get_db

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


def get_analytics_service(db=Depends(get_db)) -> AnalyticsService:
    repo = AnalyticsRepositoryPostgres(db)
    return AnalyticsService(repo)


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    time_range: str = Query("today", pattern="^(today|week|month)$"),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """
    Retorna toda la data combinada para EstadisticasScreen.
    El campo top_products trae los 5 más vendidos (preview).
    """
    return service.get_dashboard_data(time_range)


@router.get("/top-products", response_model=List[TopProduct])
def get_top_products(
    time_range: str = Query("today", pattern="^(today|week|month)$"),
    limit: int = Query(50, ge=1, le=200),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """
    Lista completa de productos más vendidos.
    Usado por la pantalla 'Ver todos' de EstadisticasScreen.
    Parámetros:
      - time_range: today | week | month
      - limit: cuántos productos devolver (default 50, máx 200)
    """
    return service.get_top_products(time_range, limit)