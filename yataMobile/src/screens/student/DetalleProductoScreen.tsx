import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useProducts } from '../../contexts/ProductContext';
import { useCartStore } from '../../store/cartStore';
import { StudentStackParamList, ExtraOption as ExtraOptionType } from '../../types';

// 🎨 COLORES
const COLORS = {
  primary: '#630ED4',
  primaryContainer: '#7C3AED',
  surface: '#F8F9FA',
  onSurface: '#191C1D',
  onSurfaceVariant: '#4A4455',
  onPrimary: '#FFFFFF',
  surfaceContainerLow: '#F3F4F5',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainer: '#EDEEEF',
  surfaceContainerHigh: '#E0E1E2',
  outline: '#7B7487',
  outlineVariant: '#CCC3D8',
  tertiary: '#7D3D00',
  error: '#BA1A1A',
};

interface SelectedExtra extends ExtraOptionType {
  selected: boolean;
}

type DetalleProductoRouteProp = RouteProp<StudentStackParamList, 'DetalleProducto'>;

const MAX_INSTRUCTIONS_LENGTH = 140;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44;

export default function DetalleProductoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<DetalleProductoRouteProp>();
  const { productId } = route.params;

  // ✅ Obtener producto del contexto compartido con cocina
  const { getProductById } = useProducts();
  const product = getProductById(productId);
  const { addItem } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product?.availableSizes?.[0]?.id ?? null
  );
  const [extras, setExtras] = useState<SelectedExtra[]>(
    (product?.availableExtras ?? []).map((e) => ({ ...e, selected: false }))
  );
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');

  // Si el producto no existe
  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.errorState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.outline} />
          <Text style={styles.errorText}>Producto no encontrado</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Volver al menú</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentSize = product.availableSizes.find((s) => s.id === selectedSize);
  const sizeExtra = currentSize?.price ?? 0;
  const extrasTotal = extras
    .filter((e) => e.selected)
    .reduce((sum, e) => sum + e.price, 0);
  const totalPrice = (product.basePrice + sizeExtra + extrasTotal) * quantity;

  // 🔧 HANDLERS
  const handleToggleExtra = (extraId: string) => {
    setExtras((prev) =>
      prev.map((e) => (e.id === extraId ? { ...e, selected: !e.selected } : e))
    );
  };

  const handleToggleIngredient = (ingredientId: string) => {
    setRemovedIngredients((prev) =>
      prev.includes(ingredientId)
        ? prev.filter((id) => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: totalPrice / quantity,
      image: product.image,
      customization: {
        size: currentSize,
        removedIngredients,
        addedExtras: extras.filter((e) => e.selected).map(({ selected, ...e }) => e),
        specialInstructions: instructions.trim() || undefined,
      },
    });

    for (let i = 1; i < quantity; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        price: totalPrice / quantity,
        image: product.image,
        customization: {
          size: currentSize,
          removedIngredients,
          addedExtras: extras.filter((e) => e.selected).map(({ selected, ...e }) => e),
          specialInstructions: instructions.trim() || undefined,
        },
      });
    }

    Alert.alert(
      '✅ Agregado al carrito',
      `${quantity > 1 ? `${quantity}x ` : ''}${product.name} fue agregado correctamente`,
      [
        {
          text: 'Continuar comprando',
          onPress: () => navigation.goBack(),
          style: 'cancel'
        },
        {
          text: 'Ver carrito',
          onPress: () =>
            navigation.navigate('StudentTabs', {
              screen: 'Carrito',
            }),
          style: 'default'
        }
      ]
    );
  };

  const handleGoBack = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* ── HEADER: IMAGEN + BACK BUTTON ── */}
      <View style={styles.header}>
        <Image
          source={{ uri: product.image }}
          style={styles.productImage}
          resizeMode="cover"
          accessibilityLabel={product.name}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent']}
          style={styles.imageOverlay}
        />
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          accessibilityLabel="Volver al menú"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
      </View>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        {/* Información del producto */}
        <View style={styles.productInfo}>
          <View style={styles.productText}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productDescription}>{product.description}</Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>${product.basePrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── TAMAÑOS (si tiene) ── */}
        {product.availableSizes.length > 0 && (
          <>
            <View style={styles.sectionSpacer} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tamaño</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>Requerido</Text>
                </View>
              </View>
              <View style={styles.sizesRow}>
                {product.availableSizes.map((size) => (
                  <TouchableOpacity
                    key={size.id}
                    style={[styles.sizeCard, selectedSize === size.id && styles.sizeCardSelected]}
                    onPress={() => setSelectedSize(size.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sizeName, selectedSize === size.id && styles.sizeNameSelected]}>
                      {size.name}
                    </Text>
                    <Text style={[styles.sizePrice, selectedSize === size.id && styles.sizePriceSelected]}>
                      {size.price === 0 ? 'Base' : `+$${size.price}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── INGREDIENTES (removibles) ── */}
        {product.baseIngredients.filter((i) => i.removable).length > 0 && (
          <>
            <View style={styles.sectionSpacer} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ingredientes</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Quitar</Text>
                </View>
              </View>
              <View style={styles.extrasList}>
                {product.baseIngredients
                  .filter((i) => i.removable)
                  .map((ingredient) => {
                    const isRemoved = removedIngredients.includes(ingredient.id);
                    return (
                      <TouchableOpacity
                        key={ingredient.id}
                        style={[styles.extraCard, isRemoved && styles.extraCardRemoved]}
                        onPress={() => handleToggleIngredient(ingredient.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.extraContent}>
                          <View style={styles.checkboxContainer}>
                            <View style={[styles.checkbox, isRemoved && styles.checkboxRemoved]}>
                              {isRemoved && (
                                <MaterialCommunityIcons name="close" size={14} color={COLORS.onPrimary} />
                              )}
                            </View>
                            <Text style={[styles.extraName, isRemoved && styles.extraNameRemoved]}>
                              {ingredient.name}
                            </Text>
                          </View>
                          <Text style={styles.extraPriceFree}>Sin costo</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          </>
        )}

        {/* ── EXTRAS ── */}
        {extras.length > 0 && (
          <>
            <View style={styles.sectionSpacer} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Extras</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Opcional</Text>
                </View>
              </View>
              <View style={styles.extrasList}>
                {extras.map((extra) => (
                  <TouchableOpacity
                    key={extra.id}
                    style={[styles.extraCard, extra.selected && styles.extraCardSelected]}
                    onPress={() => handleToggleExtra(extra.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.extraContent}>
                      <View style={styles.checkboxContainer}>
                        <View style={[styles.checkbox, extra.selected && styles.checkboxChecked]}>
                          {extra.selected && (
                            <MaterialCommunityIcons name="check" size={14} color={COLORS.onPrimary} />
                          )}
                        </View>
                        <Text style={styles.extraName}>{extra.name}</Text>
                      </View>
                      <Text style={styles.extraPrice}>+${extra.price.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={styles.sectionSpacer} />

        {/* ── OBSERVACIONES ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observaciones o instrucciones especiales</Text>
          <View style={styles.textareaContainer}>
            <TextInput
              style={styles.textarea}
              placeholder="Ej. sin cebolla, salsa aparte, extra servilletas..."
              placeholderTextColor={`${COLORS.onSurfaceVariant}80`}
              value={instructions}
              onChangeText={(text) => {
                if (text.length <= MAX_INSTRUCTIONS_LENGTH) setInstructions(text);
              }}
              multiline
              maxLength={MAX_INSTRUCTIONS_LENGTH}
            />
            <Text style={styles.charCounter}>
              {instructions.length}/{MAX_INSTRUCTIONS_LENGTH}
            </Text>
          </View>
        </View>

        <View style={styles.sectionSpacer} />

        {/* ── CANTIDAD ── */}
        <View style={styles.quantitySection}>
          <TouchableOpacity style={styles.quantityButton} onPress={handleDecrement}>
            <MaterialCommunityIcons name="minus" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.quantityValue}>{quantity}</Text>
          <TouchableOpacity style={[styles.quantityButton, styles.quantityButtonAdd]} onPress={handleIncrement}>
            <MaterialCommunityIcons name="plus" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── BOTÓN FIJO INFERIOR ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleAddToCart}
          activeOpacity={0.9}
          accessibilityLabel={`Agregar ${product.name} al carrito`}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryContainer]}
            style={styles.addButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.addButtonText}>
              Agregar al carrito — ${totalPrice.toFixed(2)}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// 🎨 ESTILOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT : 0,
  },

  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  errorText: { fontSize: 18, fontWeight: '600', color: COLORS.onSurface },
  errorButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  errorButtonText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '700' },

  header: {
    height: 353,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.surfaceContainerLowest}E6`,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },

  content: { flex: 1 },
  contentPadding: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 140 },

  productInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  productText: { flex: 1, marginRight: 16 },
  productName: { fontSize: 24, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -0.5, marginBottom: 4 },
  productDescription: { fontSize: 16, color: COLORS.onSurfaceVariant, lineHeight: 22 },
  priceBadge: { backgroundColor: COLORS.surfaceContainerLow, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  priceText: { fontSize: 18, fontWeight: '500', color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  sectionSpacer: { height: 32 },
  section: { gap: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.5 },
  optionalBadge: { backgroundColor: `${COLORS.primary}1A`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  optionalBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
  requiredBadge: { backgroundColor: `${COLORS.error}1A`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  requiredBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.error, textTransform: 'uppercase', letterSpacing: 1 },

  sizesRow: { flexDirection: 'row', gap: 12 },
  sizeCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    gap: 4,
  },
  sizeCardSelected: { backgroundColor: `${COLORS.primary}1A`, borderColor: COLORS.primary },
  sizeName: { fontSize: 16, fontWeight: '600', color: COLORS.onSurface },
  sizeNameSelected: { color: COLORS.primary },
  sizePrice: { fontSize: 13, color: COLORS.onSurfaceVariant, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  sizePriceSelected: { color: COLORS.primary },

  extrasList: { gap: 12 },
  extraCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
  },
  extraCardSelected: { backgroundColor: `${COLORS.primary}1A`, borderColor: COLORS.primary },
  extraCardRemoved: { backgroundColor: `${COLORS.error}0D`, borderColor: COLORS.error, opacity: 0.7 },
  extraContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: COLORS.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxRemoved: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  extraName: { fontSize: 16, fontWeight: '500', color: COLORS.onSurface },
  extraNameRemoved: { textDecorationLine: 'line-through', color: COLORS.onSurfaceVariant },
  extraPrice: { fontSize: 14, fontWeight: '500', color: COLORS.onSurfaceVariant, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  extraPriceFree: { fontSize: 12, fontWeight: '500', color: COLORS.outline, fontStyle: 'italic' },

  textareaContainer: { position: 'relative' },
  textarea: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: COLORS.onSurface,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCounter: { position: 'absolute', bottom: 12, right: 16, fontSize: 10, fontWeight: '500', color: `${COLORS.onSurfaceVariant}66`, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  quantitySection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, paddingVertical: 16 },
  quantityButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  quantityButtonAdd: { backgroundColor: `${COLORS.primaryContainer}1A` },
  quantityValue: { fontSize: 24, fontWeight: '700', color: COLORS.onSurface, width: 32, textAlign: 'center' },

  bottomSpacer: { height: 24 },

  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    backgroundColor: `${COLORS.surface}CC`,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
  },
  addButton: {
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 18, fontWeight: '700', color: COLORS.onPrimary },
});