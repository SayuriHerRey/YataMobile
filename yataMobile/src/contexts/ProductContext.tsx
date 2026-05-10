// src/contexts/ProductContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CustomizableProduct } from '../types';
import { productService } from '../services/productService';

interface ProductContextType {
  products: CustomizableProduct[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addProduct: (product: Omit<CustomizableProduct, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<CustomizableProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => CustomizableProduct | undefined;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const useProducts = () => {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductProvider');
  return ctx;
};

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<CustomizableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📡 Cargando productos desde:', 'http://18.211.7.125:8002');
      const data = await productService.list();

      console.log(`✅ ${data.length} productos cargados correctamente`);
      setProducts(data);
    } catch (e: any) {
      const errorMsg = e.message ?? 'Error cargando productos';
      setError(errorMsg);
      console.error('[ProductContext] Error:', errorMsg);
      console.error('[ProductContext] Detalle:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addProduct = async (product: Omit<CustomizableProduct, 'id'>) => {
    try {
      const created = await productService.create(product);
      setProducts(prev => [...prev, created]);
    } catch (e) {
      console.error('Error creando producto:', e);
      throw e;
    }
  };

  const updateProduct = async (id: string, updates: Partial<CustomizableProduct>) => {
    const updated = await productService.update(id, updates);
    setProducts(prev => prev.map(p => p.id === id ? updated : p));
  };

  const deleteProduct = async (id: string) => {
    await productService.delete(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const toggleProduct = async (id: string) => {
    const updated = await productService.toggleAvailability(id);
    setProducts(prev => prev.map(p => p.id === id ? updated : p));
  };

  const getProductById = (id: string) => products.find(p => p.id === id);

  return (
    <ProductContext.Provider value={{
      products,
      loading,
      error,
      reload: load,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleProduct,
      getProductById,
    }}>
      {children}
    </ProductContext.Provider>
  );
};