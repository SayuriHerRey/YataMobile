import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCartStore } from '../../store/cartStore';
import { useProducts } from '../../contexts/ProductContext';
import { CustomizableProduct, ProductCustomization } from '../../types';
import ProductCustomizationModal from '../../components/ProductCustomizationModal';
import { Session, AppUser } from '../../services/config';
import { notificationService } from '../../services/notificationService';
import NotificationDrawer from '../../components/NotificationDrawer';

// 🎨 PALETA DE COLORES
const COLORS = {
  primary: '#630ED4',
  primaryContainer: '#7C3AED',
  secondaryContainer: '#8B4EF7',
  surface: '#F8F9FA',
  onSurface: '#191C1D',
  onSurfaceVariant: '#4A4455',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#EDE0FF',
  surfaceContainer: '#EDEEEF',
  surfaceContainerLow: '#F3F4F5',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerHigh: '#E7E8E9',
  surfaceContainerHighest: '#E1E3E4',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  outline: '#7B7487',
  outlineVariant: '#CCC3D8',
};

interface Category {
  id: string;
  name: string;
}

const CATEGORIES: Category[] = [
  { id: 'all', name: 'Todos' },
  { id: 'Alimentos', name: 'Alimentos' },
  { id: 'Bebidas', name: 'Bebidas' },
  { id: 'Snacks', name: 'Snacks' },
];

export default function MenuScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customizationModalVisible, setCustomizationModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CustomizableProduct | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Productos del contexto compartido con cocina
  const { products } = useProducts();
  const { addItem, totalItems } = useCartStore();
  const cartCount = totalItems();

  // Cargar usuario real
  useEffect(() => {
    const loadUser = async () => {
      const userData = await Session.getUser();
      console.log('👤 Usuario cargado en MenuScreen:', userData);
      setUser(userData);
      if (userData) {
        const count = await notificationService.getUnreadCount(userData.id);
        setUnreadCount(count);
      }
    };
    loadUser();
  }, []);

  // 🔧 HANDLERS
  const handleSearch = (text: string) => setSearchQuery(text);

  const handleQuickAdd = (product: CustomizableProduct) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.basePrice,
      image: product.image,
    });
    Alert.alert('✅ Agregado al carrito', `${product.name} fue agregado correctamente`);
  };

  const handleProductPress = (product: CustomizableProduct) => {
    if (!product.available) return;
    // Navegar a DetalleProducto pasando el ID del producto
    navigation.navigate('DetalleProducto', { productId: product.id, productName: product.name });
  };

  const handleCustomizationConfirm = (customization: ProductCustomization, totalPrice: number) => {
    if (!selectedProduct) return;
    addItem({
      productId: selectedProduct.id,
      name: selectedProduct.name,
      price: totalPrice,
      image: selectedProduct.image,
      customization,
    });
    setCustomizationModalVisible(false);
    setSelectedProduct(null);
    Alert.alert('✅ Agregado al carrito', `${selectedProduct.name} fue agregado correctamente`);
  };

  const handleCloseCustomization = () => {
    setCustomizationModalVisible(false);
    setSelectedProduct(null);
  };

  // 🧩 RENDERERS
  const renderCategoryPill = ({ item }: { item: Category }) => {
    const isActive = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[styles.categoryPill, isActive && styles.categoryPillActive]}
        onPress={() => setSelectedCategory(item.id)}
        activeOpacity={0.8}
      >
        <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProductCard = (product: CustomizableProduct) => {
    const isAvailable = product.available;

    return (
      <TouchableOpacity
        key={product.id}
        style={[styles.productCard, !isAvailable && styles.productCardDisabled]}
        disabled={!isAvailable}
        activeOpacity={isAvailable ? 0.9 : 1}
        onPress={() => handleProductPress(product)}
      >
        {/* Imagen */}
        <View style={styles.productImageContainer}>
          <Image
            source={{ uri: product.image }}
            style={styles.productImage}
            resizeMode="cover"
            accessibilityLabel={product.name}
          />
          {isAvailable ? (
            <View style={styles.availabilityBadge}>
              <Text style={styles.availabilityBadgeText}>Disponible</Text>
            </View>
          ) : (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>Agotado</Text>
            </View>
          )}
        </View>

        {/* Contenido */}
        <View style={[styles.productContent, !isAvailable && styles.productContentDisabled]}>
          <View style={styles.productHeader}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={[styles.productPrice, !isAvailable && styles.productPriceDisabled]}>
              ${product.basePrice.toFixed(2)}
            </Text>
          </View>

          <Text style={styles.productDescription} numberOfLines={2}>
            {product.description}
          </Text>

          {isAvailable ? (
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickAdd(product);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="cart-plus" size={18} color={COLORS.onPrimary} />
              <Text style={styles.addToCartButtonText}>Agregar al carrito</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.disabledButton}>
              <Text style={styles.disabledButtonText}>No disponible</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // 🔍 FILTRADO
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Obtener el nombre del usuario real o mostrar "Estudiante" por defecto
  const displayName = user?.name?.split(' ')[0] || 'Estudiante';
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?background=630ED4&color=fff&name=${displayName}`;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <SafeAreaView style={styles.container}>

        {/* ── TOP APP BAR ── */}
        <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8 }]}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              accessibilityLabel="Foto de perfil"
            />
            <Text style={styles.cafeteriaName}>YaTá</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {user && (
              <NotificationDrawer
                userId={user.id}
                unreadCount={unreadCount}
                onUnreadChange={setUnreadCount}
              />
            )}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('Carrito')}
              accessibilityLabel="Carrito de compras"
            >
              <View>
                <MaterialCommunityIcons name="cart-outline" size={24} color={COLORS.primary} />
                {cartCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CONTENIDO SCROLLABLE ── */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollPadding}
          showsVerticalScrollIndicator={false}
        >
          {/* Buscador */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.onSurfaceVariant} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="¿Qué se te antoja hoy?"
              placeholderTextColor={`${COLORS.onSurfaceVariant}99`}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          {/* Categorías */}
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategoryPill}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          />

          {/* Header de Sección */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menú del Día</Text>
            <View style={styles.varietiesBadge}>
              <Text style={styles.varietiesBadgeText}>{filteredProducts.length} productos</Text>
            </View>
          </View>

          {/* Grid de Productos */}
          <View style={styles.productGrid}>
            {filteredProducts.length > 0
              ? filteredProducts.map((product) => renderProductCard(product))
              : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={48} color={COLORS.outlineVariant} />
                  <Text style={styles.emptyStateText}>Sin productos en esta categoría</Text>
                </View>
              )
            }
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Modal de Personalización (solo se usa si navegas desde detalle) */}
        <ProductCustomizationModal
          visible={customizationModalVisible}
          product={selectedProduct}
          onClose={handleCloseCustomization}
          onConfirm={handleCustomizationConfirm}
        />

      </SafeAreaView>
    </>
  );
}

// 🎨 ESTILOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceContainer },
  cafeteriaName: { fontSize: 20, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.5 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: COLORS.onPrimary, fontSize: 9, fontWeight: '700' },

  scrollContent: { flex: 1 },
  scrollPadding: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.onSurface, padding: 0 },

  categoriesContainer: { gap: 12, paddingVertical: 4, marginBottom: 24 },
  categoryPill: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 9999, backgroundColor: COLORS.surfaceContainerHigh },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryPillText: { fontSize: 14, fontWeight: '500', color: COLORS.onSurfaceVariant },
  categoryPillTextActive: { color: COLORS.onPrimary, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, paddingTop: 8 },
  sectionTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -1 },
  varietiesBadge: { backgroundColor: `${COLORS.primary}1A`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  varietiesBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  productGrid: { gap: 24, paddingBottom: 24 },
  productCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  productCardDisabled: { opacity: 0.6 },
  productImageContainer: { height: 192, position: 'relative', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  availabilityBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: `${COLORS.primaryContainer}E6`,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  availabilityBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.onPrimaryContainer, textTransform: 'uppercase', letterSpacing: 1 },
  soldOutOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(25, 28, 29, 0.4)', alignItems: 'center', justifyContent: 'center' },
  soldOutText: { fontSize: 14, fontWeight: '700', color: COLORS.onError, backgroundColor: COLORS.error, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 9999, textTransform: 'uppercase', letterSpacing: 1 },
  productContent: { padding: 20, gap: 12 },
  productContentDisabled: { opacity: 0.6 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface, flex: 1, marginRight: 8 },
  productPrice: { fontSize: 18, fontWeight: '500', color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  productPriceDisabled: { color: COLORS.onSurface },
  productDescription: { fontSize: 14, color: COLORS.onSurfaceVariant, lineHeight: 20 },

  // ✅ Botón único simplificado
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 16,
  },
  addToCartButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.onPrimary,
    letterSpacing: 0.5,
  },
  disabledButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerHighest,
    paddingVertical: 12,
    borderRadius: 16,
  },
  disabledButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
  },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyStateText: { fontSize: 16, color: COLORS.onSurfaceVariant, fontWeight: '500' },

  bottomSpacer: { height: 24 },
});