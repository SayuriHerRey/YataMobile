// src/services/orderService.ts

import api from './api';
import { CartItem } from '../store/cartStore';
import { ProductCustomization } from '../types';

export type OrderStatus = 'recibido' | 'en_preparacion' | 'listo' | 'entregado';
export type PaymentMethod = 'tarjeta' | 'efectivo';

export interface OrderItemOut {
    id: string;
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    customization_text: string;
    done: boolean;
}

export interface OrderOut {
    id: string;
    order_number: string;
    student_id: string;
    items: OrderItemOut[];
    total: number;
    payment_method: PaymentMethod;
    status: OrderStatus;
    priority: boolean;
    special_instructions: string | null;
    generate_receipt: boolean;
    elapsed_minutes: number;
    is_urgent: boolean;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
}

function mapCustomization(c?: ProductCustomization) {
    if (!c) return undefined;
    return {
        size_name: c.size?.name,
        size_price: c.size?.price ?? 0,
        removed_ingredients: c.removedIngredients ?? [],
        added_extras: c.addedExtras?.map(e => e.name) ?? [],
        special_instructions: c.specialInstructions,
    };
}

export const orderService = {

    async createOrder(
        studentId: string,
        cartItems: CartItem[],
        paymentMethod: 'card' | 'cash',
        generateReceipt: boolean = true,
    ): Promise<OrderOut> {

        const body = {
            student_id: studentId,
            items: cartItems.map(item => ({
                product_id: item.productId,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                customization: mapCustomization(item.customization),
            })),
            payment_method: paymentMethod === 'card' ? 'tarjeta' : 'efectivo',
            generate_receipt: generateReceipt,
            priority: false,
        };

        const response = await api.post('/orders/', body);
        return response.data;
    },

    async getOrderStatus(orderId: string): Promise<OrderOut> {
        const response = await api.get(`/orders/${orderId}`);
        return response.data;
    },

    async getStudentHistory(studentId: string): Promise<OrderOut[]> {
        const response = await api.get(`/orders/student/${studentId}`);
        return response.data;
    },

    async getActiveOrders(): Promise<OrderOut[]> {
        const response = await api.get('/orders/active');
        return response.data;
    },

    async startPreparation(orderId: string): Promise<OrderOut> {
        const response = await api.patch(`/orders/${orderId}/start`);
        return response.data;
    },

    async markItemDone(orderId: string, itemId: string): Promise<OrderOut> {
        const response = await api.patch(`/orders/${orderId}/items/${itemId}/done`);
        return response.data;
    },

    async markOrderReady(orderId: string): Promise<OrderOut> {
        const response = await api.patch(`/orders/${orderId}/ready`);
        return response.data;
    },

    async markOrderDelivered(orderId: string): Promise<OrderOut> {
        const response = await api.patch(`/orders/${orderId}/deliver`);
        return response.data;
    },
};
