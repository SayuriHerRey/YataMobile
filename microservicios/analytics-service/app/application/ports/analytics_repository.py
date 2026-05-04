from abc import ABC, abstractmethod
from typing import List, Dict, Any

class AnalyticsRepository(ABC):
    @abstractmethod
    def get_metrics(self, time_range: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_hourly_data(self, time_range: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_top_products(self, time_range: str, limit: int = 5) -> List[Dict[str, Any]]:
        pass