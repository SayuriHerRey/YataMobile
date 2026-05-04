from pydantic import BaseModel
from typing import List

class TopProduct(BaseModel):
    id: str
    name: str
    image: str
    ordersToday: int
    revenue: float

class HourlyData(BaseModel):
    hour: str
    value: int

class Metrics(BaseModel):
    totalOrders: int
    growth: str
    avgTicket: float
    avgPrepTime: int

class DashboardResponse(BaseModel):
    metrics: Metrics
    hourly_data: List[HourlyData]
    top_products: List[TopProduct]