// src/services/paymentService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URLS } from './config';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'card' | 'cash';

export interface Payment {
    id: string;
    order_id: string;
    user_id: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    card_last4: string | null;
    generate_receipt: boolean;
    gateway_reference: string | null;
    failure_reason: string | null;
}

export interface ProcessPaymentPayload {
    order_id: string;
    user_id: string;
    amount: number;
    method: PaymentMethod;
    generate_receipt?: boolean;
    card_last4?: string | null;
    card_holder?: string | null;
}

const BASE = `${URLS.PAYMENT}/payments`;

async function authHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('userToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export async function processPayment(payload: ProcessPaymentPayload): Promise<Payment> {
    const res = await fetch(`${BASE}/`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `Error al procesar pago: ${res.status}`);
    }
    return res.json();
}

/** Consultar un pago por su ID */
export async function getPayment(paymentId: string): Promise<Payment> {
    const res = await fetch(`${BASE}/${paymentId}`, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`Pago no encontrado: ${res.status}`);
    return res.json();
}

/** Consultar el pago asociado a una orden */
export async function getPaymentByOrder(orderId: string): Promise<Payment | null> {
    const res = await fetch(`${BASE}/order/${orderId}`, { headers: await authHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Error al buscar pago: ${res.status}`);
    return res.json();
}

/** Historial de pagos de un usuario (para HistorialScreen) */
export async function getUserPaymentHistory(userId: string): Promise<Payment[]> {
    const res = await fetch(`${BASE}/user/${userId}/history`, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`Error al obtener historial: ${res.status}`);
    return res.json();
}

/** Staff: confirmar pago en efectivo */
export async function confirmCashPayment(paymentId: string): Promise<Payment> {
    const res = await fetch(`${BASE}/${paymentId}/confirm-cash`, {
        method: 'PATCH',
        headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`Error al confirmar efectivo: ${res.status}`);
    return res.json();
}

/** Reembolsar un pago completado */
export async function refundPayment(paymentId: string): Promise<Payment> {
    const res = await fetch(`${BASE}/${paymentId}/refund`, {
        method: 'PATCH',
        headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`Error al reembolsar: ${res.status}`);
    return res.json();
}

/** Etiqueta legible del estado del pago */
export function getPaymentStatusLabel(status: PaymentStatus): string {
    const labels: Record<PaymentStatus, string> = {
        pending: 'Pendiente (efectivo)',
        completed: 'Pago completado',
        failed: 'Pago fallido',
        refunded: 'Reembolsado',
    };
    return labels[status] ?? status;
}