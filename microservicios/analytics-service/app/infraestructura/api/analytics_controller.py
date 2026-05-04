from fastapi import APIRouter, Depends, Query
from app.domain.analytics import DashboardResponse
from app.application.services.analytics_service import AnalyticsService
from app.infraestructura.adapters.analytics_repository import AnalyticsRepositoryPostgres
from app.infraestructura.db import get_db

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])

def get_analytics_service(db=Depends(get_db)) -> AnalyticsService:
    repo = AnalyticsRepositoryPostgres(db)
    return AnalyticsService(repo)

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(time_range: str = Query("today", pattern="^(today|week|month)$"), service: AnalyticsService = Depends(get_analytics_service)):
    """
    Retorna toda la data combinada para EstadisticasScreen
    """
    return service.get_dashboard_data(time_range)