// src/services/productService.ts

import { URLS } from './config';
import { CustomizableProduct } from '../types';

// Mapea la respuesta del backend al tipo del frontend
function mapProduct(p: any): CustomizableProduct {
    return {
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        basePrice: p.base_price,
        image: p.image_url ?? '',
        available: p.available,
        category: p.category,
        requiresCustomization: p.requires_customization,
        hasExtras: p.has_extras,
        baseIngredients: p.base_ingredients ?? [],
        availableSizes: p.available_sizes ?? [],
        availableExtras: p.available_extras ?? [],
    };
}

const BASE = `${URLS.PRODUCT}/products`;

export const productService = {

    async list(availableOnly = false, category?: string): Promise<CustomizableProduct[]> {
        const params = new URLSearchParams();
        if (availableOnly) params.set('available_only', 'true');
        if (category) params.set('category', category);
        const res = await fetch(`${BASE}?${params.toString()}`);
        if (!res.ok) throw new Error(`Error listando productos: ${res.status}`);
        const data = await res.json();
        return data.map(mapProduct);
    },

    async getById(productId: string): Promise<CustomizableProduct> {
        const res = await fetch(`${BASE}/${productId}`);
        if (!res.ok) throw new Error(`Producto no encontrado: ${res.status}`);
        return mapProduct(await res.json());
    },

    async create(product: Omit<CustomizableProduct, 'id'>): Promise<CustomizableProduct> {
        const body = {
            name: product.name,
            description: product.description,
            base_price: product.basePrice,
            category: product.category,
            image_url: product.image,
            available: product.available,
            requires_customization: product.requiresCustomization,
            has_extras: product.hasExtras,
            base_ingredients: product.baseIngredients,
            available_sizes: product.availableSizes,
            available_extras: product.availableExtras,
        };
        const res = await fetch(BASE + '/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Error creando producto: ${res.status}`);
        return mapProduct(await res.json());
    },

    async update(id: string, updates: Partial<CustomizableProduct>): Promise<CustomizableProduct> {
        const body: any = {};
        if (updates.name !== undefined) body.name = updates.name;
        if (updates.description !== undefined) body.description = updates.description;
        if (updates.basePrice !== undefined) body.base_price = updates.basePrice;
        if (updates.category !== undefined) body.category = updates.category;
        if (updates.image !== undefined) body.image_url = updates.image;
        if (updates.available !== undefined) body.available = updates.available;

        const res = await fetch(`${BASE}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Error actualizando producto: ${res.status}`);
        return mapProduct(await res.json());
    },

    async toggleAvailability(id: string): Promise<CustomizableProduct> {
        const res = await fetch(`${BASE}/${id}/toggle`, { method: 'PATCH' });
        if (!res.ok) throw new Error(`Error cambiando disponibilidad: ${res.status}`);
        return mapProduct(await res.json());
    },

    async delete(id: string): Promise<void> {
        const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 204) throw new Error(`Error eliminando producto: ${res.status}`);
    },
};
