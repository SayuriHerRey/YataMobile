import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCartStore } from '../../store/cartStore';
import { ProductCustomization } from '../../types';
import { Session, AppUser } from '../../services/config';

// 🎨 COLORES
const COLORS = {
  primary: '#630ED4',
  primaryContainer: '#7C3AED',
  secondary: '#712EDD',
  surface: '#F8F9FA',
  onSurface: '#191C1D',
  onSurfaceVariant: '#4A4455',
  onPrimary: '#FFFFFF',
  surfaceContainer: '#EDEEEF',
  surfaceContainerLow: '#F3F4F5',
  surfaceContainerLowest: '#FFFFFF',
  outlineVariant: '#CCC3D8',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
};

// 📦 TIPOS
interface CartItem {
  id: string;
  productId: string;
  name: string;
  customization?: ProductCustomization;
  price: number;
  image: string;
  quantity: number;
}

const SERVICE_FEE = 0.00;
const ESTIMATED_TIME = '15 - 20 mins';

export default function CarritoScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { items: cartItems, removeItem, updateQuantity } = useCartStore();
  const [user, setUser] = useState<AppUser | null>(null);

  // Cargar usuario real
  useEffect(() => {
    const loadUser = async () => {
      const userData = await Session.getUser();
      console.log('👤 Usuario cargado en CarritoScreen:', userData);
      setUser(userData);
    };
    loadUser();
  }, []);

  // 🔧 CALCULOS
  const subtotal = cartItems.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
  const total = subtotal + SERVICE_FEE;

  // 🔧 HANDLERS
  const handleGoBack = () => navigation.goBack();

  const handleNotification = () => {
    // TODO: Implementar navegación a pantalla de notificaciones
    console.log('🔔 Ver notificaciones');
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    updateQuantity(itemId, newQuantity);
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega al menos un producto para continuar.');
      return;
    }
    console.log('💳 Navegando a Checkout con total:', total);
    navigation.navigate('Checkout', { total });
  };

  const renderCustomization = (customization: ProductCustomization) => {
    const details: string[] = [];

    if (customization.size && customization.size.price > 0) {
      details.push(`Tamaño: ${customization.size.name}`);
    }

    if (customization.removedIngredients.length > 0) {
      details.push(`Sin: ${customization.removedIngredients.join(', ')}`);
    }

    if (customization.addedExtras.length > 0) {
      details.push(`Extra: ${customization.addedExtras.map(e => e.name).join(', ')}`);
    }

    if (customization.specialInstructions) {
      details.push(`Notas: ${customization.specialInstructions}`);
    }

    return details.length > 0 ? (
      <Text style={styles.itemCustomization}>{details.join(' • ')}</Text>
    ) : null;
  };

  // Obtener el nombre del usuario real o mostrar "Estudiante" por defecto
  const displayName = user?.name?.split(' ')[0] || 'Estudiante';
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?background=630ED4&color=fff&name=${displayName}`;

  // 🧩 RENDER: Item del carrito
  const renderCartItem = (item: CartItem) => (
    <View key={item.id} style={styles.cartItem}>
      <Image
        source={{ uri: item.image }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <View>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.customization && renderCustomization(item.customization)}
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemoveItem(item.id)}>
            <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
        <View style={styles.itemFooter}>
          <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
          <View style={styles.quantityControl}>
            <TouchableOpacity style={styles.quantityButton} onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}>
              <MaterialCommunityIcons name="minus" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{item.quantity}</Text>
            <TouchableOpacity style={styles.quantityButton} onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}>
              <MaterialCommunityIcons name="plus" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyCart}>
      <MaterialCommunityIcons name="cart-outline" size={64} color={COLORS.onSurfaceVariant} />
      <Text style={styles.emptyCartTitle}>Tu carrito está vacío</Text>
      <Text style={styles.emptyCartSubtitle}>Agrega productos del menú para comenzar tu pedido</Text>
      <TouchableOpacity style={styles.emptyCartButton} onPress={handleGoBack}>
        <Text style={styles.emptyCartButtonText}>Ver menú</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <SafeAreaView style={styles.container}>

        {/* ── TOP APP BAR ── */}
        <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8 }]}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity style={styles.iconButton} onPress={handleGoBack}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.onSurface} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Mi Carrito</Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconButton} onPress={handleNotification}>
              <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.onSurface} />
            </TouchableOpacity>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          </View>
        </View>

        {/* ── CONTENIDO ── */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollPadding}
          showsVerticalScrollIndicator={false}
        >
          {cartItems.length > 0 ? (
            <>
              <View style={styles.cartList}>{cartItems.map(renderCartItem)}</View>

              <View style={styles.editorialQuote}>
                <Text style={styles.quoteText}>"El combustible perfecto para tu próxima clase."</Text>
              </View>

              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Resumen de compra</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Cargo por servicio</Text>
                    <Text style={styles.summaryValue}>${SERVICE_FEE.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.secondary} />
                  <Text style={styles.infoText}>
                    Tiempo estimado de preparación: <Text style={styles.infoTextBold}>{ESTIMATED_TIME}</Text>
                  </Text>
                </View>
              </View>

              {/* Botón dentro del scroll - AHORA SÍ SCROLLEA */}
              <View style={styles.checkoutButtonContainer}>
                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={handleProceedToCheckout}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryContainer]}
                    style={styles.checkoutGradient}
                  >
                    <Text style={styles.checkoutButtonText}>Continuar al pago</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.onPrimary} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            renderEmptyCart()
          )}

          {/* Espacio extra al final del scroll */}
          <View style={styles.scrollBottomSpacer} />
        </ScrollView>
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
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.5 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceContainer },
  scrollContent: { flex: 1 },
  scrollPadding: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  cartList: { gap: 16 },
  cartItem: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4
  },
  itemImage: { width: 96, height: 96, borderRadius: 12 },
  itemContent: { flex: 1, justifyContent: 'space-between' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  itemCustomization: { fontSize: 14, color: COLORS.onSurfaceVariant, opacity: 0.8, marginTop: 2 },
  deleteButton: { padding: 4 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  itemPrice: { fontSize: 18, fontWeight: '500', color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceContainer, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 4, gap: 16 },
  quantityButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quantityValue: { fontSize: 16, fontWeight: '600', color: COLORS.onSurface, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  emptyCart: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 16 },
  emptyCartTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  emptyCartSubtitle: { fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center' },
  emptyCartButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.primary, borderRadius: 12 },
  emptyCartButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.onPrimary },
  editorialQuote: { paddingVertical: 32, paddingHorizontal: 16, alignItems: 'center' },
  quoteText: { fontSize: 16, fontStyle: 'italic', color: COLORS.onSurfaceVariant, fontWeight: '300', textAlign: 'center' },
  summarySection: { marginTop: 8, gap: 16 },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface, paddingHorizontal: 2 },
  summaryCard: { backgroundColor: COLORS.surfaceContainerLow, borderRadius: 16, padding: 24, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: COLORS.onSurfaceVariant },
  summaryValue: { fontSize: 14, color: COLORS.onSurface, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  totalRow: { paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: `${COLORS.outlineVariant}33` },
  totalLabel: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  totalValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: `${COLORS.secondary}0D`, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  infoText: { fontSize: 12, color: COLORS.onSurfaceVariant, flex: 1 },
  infoTextBold: { fontWeight: '700', color: COLORS.onSurface },

  // Nuevo contenedor para el botón dentro del scroll
  checkoutButtonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  checkoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onPrimary,
  },
  scrollBottomSpacer: { height: 20 },
});