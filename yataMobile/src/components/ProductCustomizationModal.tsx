// src/components/ProductCustomizationModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomizableProduct, ProductCustomization, SizeOption, ExtraOption, IngredientOption } from '../types';

// 🎨 COLORES
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

interface ProductCustomizationModalProps {
  visible: boolean;
  product: CustomizableProduct | null;
  onClose: () => void;
  onConfirm: (customization: ProductCustomization, totalPrice: number) => void;
  initialCustomization?: ProductCustomization;
}

const MAX_INSTRUCTIONS_LENGTH = 140;

export default function ProductCustomizationModal({
  visible,
  product,
  onClose,
  onConfirm,
  initialCustomization,
}: ProductCustomizationModalProps) {
  const [selectedSize, setSelectedSize] = useState<SizeOption | undefined>();
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedExtras, setAddedExtras] = useState<ExtraOption[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Inicializar con valores por defecto o iniciales
  useEffect(() => {
    if (product && visible) {
      const defaultSize = product.availableSizes.find(s => s.price === 0) || product.availableSizes[0];
      setSelectedSize(initialCustomization?.size || defaultSize);
      setRemovedIngredients(initialCustomization?.removedIngredients || []);
      setAddedExtras(initialCustomization?.addedExtras || []);
      setSpecialInstructions(initialCustomization?.specialInstructions || '');
    }
  }, [product, visible, initialCustomization]);

  if (!product) return null;

  // Calcular precio total
  const basePrice = product.basePrice;
  const sizePrice = selectedSize?.price || 0;
  const extrasPrice = addedExtras.reduce((sum, extra) => sum + extra.price, 0);
  const totalPrice = (basePrice + sizePrice + extrasPrice);

  const handleToggleIngredient = (ingredientId: string) => {
    setRemovedIngredients(prev =>
      prev.includes(ingredientId)
        ? prev.filter(id => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  const handleToggleExtra = (extra: ExtraOption) => {
    setAddedExtras(prev =>
      prev.some(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const handleConfirm = () => {
    const customization: ProductCustomization = {
      size: selectedSize,
      removedIngredients,
      addedExtras,
      specialInstructions: specialInstructions.trim() || undefined,
    };
    onConfirm(customization, totalPrice);
  };

  const renderSizeOption = (size: SizeOption) => {
    const isSelected = selectedSize?.id === size.id;
    return (
      <TouchableOpacity
        key={size.id}
        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
        onPress={() => setSelectedSize(size)}
        activeOpacity={0.8}
      >
        <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
          {size.name}
        </Text>
        {size.price > 0 && (
          <Text style={[styles.optionPrice, isSelected && styles.optionPriceSelected]}>
            +${size.price.toFixed(2)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderIngredientOption = (ingredient: IngredientOption) => {
    const isRemoved = removedIngredients.includes(ingredient.id);
    return (
      <TouchableOpacity
        key={ingredient.id}
        style={[styles.ingredientCard, isRemoved && styles.ingredientCardRemoved]}
        onPress={() => handleToggleIngredient(ingredient.id)}
        activeOpacity={0.8}
        disabled={!ingredient.removable}
      >
        <View style={styles.ingredientContent}>
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isRemoved && styles.checkboxChecked]}>
              {isRemoved && (
                <MaterialCommunityIcons name="close" size={14} color={COLORS.onError} />
              )}
            </View>
            <Text style={[styles.ingredientName, isRemoved && styles.ingredientNameRemoved]}>
              {ingredient.name}
            </Text>
          </View>
          {!ingredient.removable && (
            <Text style={styles.requiredText}>Requerido</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderExtraOption = (extra: ExtraOption) => {
    const isSelected = addedExtras.some(e => e.id === extra.id);
    return (
      <TouchableOpacity
        key={extra.id}
        style={[styles.extraCard, isSelected && styles.extraCardSelected]}
        onPress={() => handleToggleExtra(extra)}
        activeOpacity={0.8}
      >
        <View style={styles.extraContent}>
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && (
                <MaterialCommunityIcons name="check" size={14} color={COLORS.onPrimary} />
              )}
            </View>
            <Text style={styles.extraName}>{extra.name}</Text>
          </View>
          <Text style={styles.extraPrice}>+${extra.price.toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={COLORS.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personalizar {product.name}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tamaños */}
          {product.availableSizes.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tamaño</Text>
              <View style={styles.optionsGrid}>
                {product.availableSizes.map(renderSizeOption)}
              </View>
            </View>
          )}

          {/* Ingredientes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredientes</Text>
            <Text style={styles.sectionSubtitle}>Toca para quitar ingredientes (sin costo)</Text>
            <View style={styles.ingredientsList}>
              {product.baseIngredients.map(renderIngredientOption)}
            </View>
          </View>

          {/* Extras */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extras</Text>
            <Text style={styles.sectionSubtitle}>Agrega ingredientes extra (con costo adicional)</Text>
            <View style={styles.extrasList}>
              {product.availableExtras.map(renderExtraOption)}
            </View>
          </View>

          {/* Instrucciones especiales */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instrucciones especiales</Text>
            <View style={styles.textareaContainer}>
              <TextInput
                style={styles.textarea}
                placeholder="Ej. sin cebolla, salsa aparte, extra servilletas..."
                placeholderTextColor={`${COLORS.onSurfaceVariant}80`}
                value={specialInstructions}
                onChangeText={(text) => {
                  if (text.length <= MAX_INSTRUCTIONS_LENGTH) {
                    setSpecialInstructions(text);
                  }
                }}
                multiline
                maxLength={MAX_INSTRUCTIONS_LENGTH}
              />
              <Text style={styles.charCounter}>
                {specialInstructions.length}/{MAX_INSTRUCTIONS_LENGTH}
              </Text>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.priceSummary}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            activeOpacity={0.9}
          >
            <Text style={styles.confirmButtonText}>Agregar al carrito</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// 🎨 ESTILOS
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  content: { flex: 1, paddingHorizontal: 24 },
  section: { marginTop: 32 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    marginBottom: 16,
  },
  optionsGrid: { flexDirection: 'row', gap: 12 },
  optionCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}1A`,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  optionNameSelected: { color: COLORS.primary, fontWeight: '600' },
  optionPrice: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  optionPriceSelected: { color: COLORS.primary },
  ingredientsList: { gap: 8 },
  ingredientCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  ingredientCardRemoved: {
    backgroundColor: `${COLORS.error}1A`,
    borderColor: COLORS.error,
  },
  ingredientContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  ingredientNameRemoved: { color: COLORS.error },
  requiredText: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    fontStyle: 'italic',
  },
  extrasList: { gap: 12 },
  extraCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
  },
  extraCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}1A`,
  },
  extraContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  extraName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  extraPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  textareaContainer: { position: 'relative' },
  textarea: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.onSurface,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCounter: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 10,
    fontWeight: '500',
    color: `${COLORS.onSurfaceVariant}66`,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bottomSpacer: { height: 120 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  priceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.onPrimary,
  },
});