from app.application.ports.analytics_repository import AnalyticsRepository
from app.domain.analytics import DashboardResponse, Metrics, HourlyData, TopProduct

class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository):
        self.repository = repository

    def get_dashboard_data(self, time_range: str) -> DashboardResponse:
        # Validar time_range
        if time_range not in ["today", "week", "month"]:
            time_range = "today"

        raw_metrics = self.repository.get_metrics(time_range)
        raw_hourly = self.repository.get_hourly_data(time_range)
        raw_products = self.repository.get_top_products(time_range)

        metrics = Metrics(**raw_metrics)
        hourly_data = [HourlyData(**data) for data in raw_hourly]
        top_products = [TopProduct(**prod) for prod in raw_products]

        return DashboardResponse(
            metrics=metrics,
            hourly_data=hourly_data,
            top_products=top_products
        )