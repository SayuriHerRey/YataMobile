export type StudentTabParamList = {
  Home: undefined;
  Menu: undefined;
  Carrito: undefined;
  Pedidos: undefined;
  Perfil: undefined;
};

export type StudentStackParamList = {
  StudentTabs: undefined;
  DetalleProducto: { productId: string; productName?: string };
  Carrito: undefined;
  Checkout: { total: number };
  Seguimiento: { orderId: string };
  Historial: undefined;
  Promo: undefined;
};

export type StaffStackParamList = {
  StaffHome: undefined;
  KDS: undefined;
  GestionMenu: undefined;
  Estadisticas: undefined;
  StaffPerfil: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  LoginUnificado: undefined;
  StudentStack: undefined;
  StaffStack: undefined;
};

export type NavigationProp = {
  navigate<RouteName extends keyof RootStackParamList>(
    route: RouteName,
    params?: RootStackParamList[RouteName]
  ): void;
  goBack(): void;
  popToTop(): void;
};

export interface SizeOption {
  id: string;
  name: string;
  price: number;
}

export interface ExtraOption {
  id: string;
  name: string;
  price: number;
}

export interface IngredientOption {
  id: string;
  name: string;
  removable: boolean;
}

export interface ProductCustomization {
  size?: SizeOption;
  removedIngredients: string[];
  addedExtras: ExtraOption[];
  specialInstructions?: string;
}

export interface CustomizableProduct {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  image: string;
  available: boolean;
  category: string;
  requiresCustomization: boolean;
  hasExtras?: boolean;
  baseIngredients: IngredientOption[];
  availableSizes: SizeOption[];
  availableExtras: ExtraOption[];
}