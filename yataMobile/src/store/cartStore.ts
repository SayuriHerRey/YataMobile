import { create } from 'zustand';
import { ProductCustomization } from '../types';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  customization?: ProductCustomization;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (newItem) => {
    const existing = get().items.find((i) =>
      i.productId === newItem.productId &&
      JSON.stringify(i.customization) === JSON.stringify(newItem.customization)
    );
    if (existing) {
      set((state) => ({
        items: state.items.map((i) =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      }));
    } else {
      set((state) => ({
        items: [
          ...state.items,
          { ...newItem, id: `cart-${Date.now()}`, quantity: 1 },
        ],
      }));
    }
  },

  removeItem: (itemId) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),

  updateQuantity: (itemId, quantity) => {
    if (quantity < 1) return;
    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, quantity } : i
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));