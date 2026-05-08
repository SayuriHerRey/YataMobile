// src/services/analyticsService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URLS } from './config';

export type TimeRange = 'today' | 'week' | 'month';

// (DashboardResponse → { metrics, hourly_data, top_products })
export interface AnalyticsMetrics {
    totalOrders: number;
    growth: string;
    avgTicket: number;
    avgPrepTime: number;
}

export interface HourlyData {
    hour: string;
    value: number;
}

export interface TopProduct {
    id: string;
    name: string;
    image: string;
    ordersToday: number;
    revenue: number;
}

export interface DashboardData {
    metrics: AnalyticsMetrics;
    hourly_data: HourlyData[];
    top_products: TopProduct[];
}

export const analyticsService = {
    async getDashboard(timeRange: TimeRange = 'today'): Promise<DashboardData> {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(
            `${URLS.ANALYTICS}/api/v1/analytics/dashboard?time_range=${timeRange}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            }
        );
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Error obteniendo estadísticas: ${res.status} - ${text}`);
        }
        return res.json();
    },
};
