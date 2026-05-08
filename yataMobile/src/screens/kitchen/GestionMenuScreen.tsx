import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  Switch,
  Modal,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useProducts } from '../../contexts/ProductContext';
import { CustomizableProduct, SizeOption, ExtraOption, IngredientOption } from '../../types';
import { Session, AppUser } from '../../services/config';

const COLORS = {
  primary: '#630ED4',
  primaryContainer: '#7C3AED',
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
  outlineVariant: '#CCC3D8',
  outline: '#7B7487',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  green: '#16A34A',
  greenLight: '#DCFCE7',
};

interface Category { id: string; name: string; }

const CATEGORIES: Category[] = [
  { id: 'all', name: 'Todos' },
  { id: 'Alimentos', name: 'Alimentos' },
  { id: 'Bebidas', name: 'Bebidas' },
  { id: 'Snacks', name: 'Snacks' },
];

const FORM_CATEGORIES = ['Alimentos', 'Bebidas', 'Snacks'];

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80';

export default function GestionMenuScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const [user, setUser] = useState<AppUser | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CustomizableProduct | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    image: '',
    category: 'Alimentos',
    available: true,
    requiresCustomization: false,
  });

  const [baseIngredients, setBaseIngredients] = useState<IngredientOption[]>([]);
  const [availableSizes, setAvailableSizes] = useState<SizeOption[]>([]);
  const [availableExtras, setAvailableExtras] = useState<ExtraOption[]>([]);

  // Cargar usuario real
  useEffect(() => {
    const loadUser = async () => {
      const userData = await Session.getUser();
      console.log('👤 Usuario cargado en GestionMenuScreen:', userData);
      setUser(userData);
    };
    loadUser();
  }, []);

  // Navegación
  const handleGoToHome = () => navigation.popToTop();
  const handleGoToAnalytics = () => navigation.navigate('Estadisticas');
  const handleGoToProfile = () => navigation.navigate('StaffPerfil');
  const handleOpenKDS = () => navigation.navigate('KDS');

  // ── HANDLERS ──────────────────────────────────────────
  const handleToggleAvailability = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) updateProduct(productId, { available: !product.available });
  };

  const handleEditProduct = (product: CustomizableProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      basePrice: product.basePrice.toString(),
      image: product.image,
      category: product.category,
      available: product.available,
      requiresCustomization: product.requiresCustomization,
    });
    setBaseIngredients([...product.baseIngredients]);
    setAvailableSizes([...product.availableSizes]);
    setAvailableExtras([...product.availableExtras]);
    setModalVisible(true);
  };

  const handleDeleteProduct = (product: CustomizableProduct) => {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${product.name}" del menú?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteProduct(product.id) },
      ]
    );
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      basePrice: '',
      image: '',
      category: 'Alimentos',
      available: true,
      requiresCustomization: false
    });
    setBaseIngredients([]);
    setAvailableSizes([]);
    setAvailableExtras([]);
    setModalVisible(true);
  };

  const handleSaveProduct = () => {
    if (!formData.name.trim()) {
      Alert.alert('Campo requerido', 'El nombre del producto es obligatorio.');
      return;
    }
    if (!formData.basePrice.trim() || isNaN(parseFloat(formData.basePrice))) {
      Alert.alert('Campo requerido', 'Ingresa un precio válido.');
      return;
    }

    const productData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      basePrice: parseFloat(formData.basePrice),
      image: formData.image.trim() || PLACEHOLDER_IMAGE,
      category: formData.category,
      available: formData.available,
      requiresCustomization: formData.requiresCustomization || availableSizes.length > 0 || availableExtras.length > 0,
      hasExtras: availableExtras.length > 0,
      baseIngredients: baseIngredients.filter(i => i.name.trim()),
      availableSizes: availableSizes.filter(s => s.name.trim()),
      availableExtras: availableExtras.filter(e => e.name.trim()),
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
    }
    setModalVisible(false);
  };

  // ── INGREDIENTES ──
  const addIngredient = () => setBaseIngredients(prev => [...prev, { id: `ing-${Date.now()}`, name: '', removable: true }]);
  const updateIngredient = (id: string, updates: Partial<IngredientOption>) =>
    setBaseIngredients(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  const removeIngredient = (id: string) => setBaseIngredients(prev => prev.filter(i => i.id !== id));

  // ── TAMAÑOS ──
  const addSize = () => setAvailableSizes(prev => [...prev, { id: `size-${Date.now()}`, name: '', price: 0 }]);
  const updateSize = (id: string, updates: Partial<SizeOption>) =>
    setAvailableSizes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  const removeSize = (id: string) => setAvailableSizes(prev => prev.filter(s => s.id !== id));

  // ── EXTRAS ──
  const addExtra = () => setAvailableExtras(prev => [...prev, { id: `extra-${Date.now()}`, name: '', price: 0 }]);
  const updateExtra = (id: string, updates: Partial<ExtraOption>) =>
    setAvailableExtras(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  const removeExtra = (id: string) => setAvailableExtras(prev => prev.filter(e => e.id !== id));

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  // Obtener datos del usuario real
  const displayName = user?.name?.split(' ')[0] || 'Staff';
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?background=630ED4&color=fff&name=${encodeURIComponent(displayName)}`;

  // ── RENDER: CATEGORY PILL ──
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

  // ── RENDER: PRODUCT CARD ──
  const renderProductCard = (product: CustomizableProduct) => {
    const isAvailable = product.available;
    return (
      <View key={product.id} style={[styles.productCard, !isAvailable && styles.productCardOff]}>
        <View style={styles.productImageWrap}>
          <Image
            source={{ uri: product.image || PLACEHOLDER_IMAGE }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {!isAvailable && (
            <View style={styles.agotadoOverlay}>
              <Text style={styles.agotadoText}>AGOTADO</Text>
            </View>
          )}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{product.category}</Text>
          </View>
          <View style={styles.switchOverlay}>
            <Switch
              value={isAvailable}
              onValueChange={() => handleToggleAvailability(product.id)}
              trackColor={{ false: COLORS.surfaceContainerHighest, true: `${COLORS.primary}80` }}
              thumbColor={isAvailable ? COLORS.primary : COLORS.outline}
              ios_backgroundColor={COLORS.surfaceContainerHighest}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>

        <View style={styles.productBody}>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>{product.description}</Text>

          <View style={styles.badgesRow}>
            {product.requiresCustomization && (
              <View style={styles.featureBadge}>
                <MaterialCommunityIcons name="pencil" size={9} color={COLORS.primary} />
                <Text style={styles.featureBadgeText}>Custom</Text>
              </View>
            )}
            {product.availableExtras.length > 0 && (
              <View style={styles.featureBadge}>
                <MaterialCommunityIcons name="plus-circle-outline" size={9} color={COLORS.primary} />
                <Text style={styles.featureBadgeText}>{product.availableExtras.length} ext</Text>
              </View>
            )}
            {product.availableSizes.length > 0 && (
              <View style={styles.featureBadge}>
                <MaterialCommunityIcons name="resize" size={9} color={COLORS.primary} />
                <Text style={styles.featureBadgeText}>{product.availableSizes.length} tam</Text>
              </View>
            )}
          </View>

          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>${product.basePrice.toFixed(2)}</Text>
            <View style={styles.productActions}>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => handleEditProduct(product)}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconActionBtn, styles.iconActionBtnDanger]}
                onPress={() => handleDeleteProduct(product)}
              >
                <MaterialCommunityIcons name="delete-outline" size={16} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFormCategorySelector = () => (
    <View style={styles.formCategoryRow}>
      {FORM_CATEGORIES.map(cat => (
        <TouchableOpacity
          key={cat}
          style={[styles.formCategoryPill, formData.category === cat && styles.formCategoryPillActive]}
          onPress={() => setFormData(prev => ({ ...prev, category: cat }))}
          activeOpacity={0.8}
        >
          <Text style={[styles.formCategoryText, formData.category === cat && styles.formCategoryTextActive]}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const previewImage = formData.image.trim() || PLACEHOLDER_IMAGE;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.container}>

        {/* ── TOP BAR CON PADDING PARA BARRA DE ESTADO ── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
          <View style={styles.topBarLeft}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View>
              <Text style={styles.topBarTitle}>Gestión de Menú</Text>
              <Text style={styles.topBarSub}>{products.length} productos registrados</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal} activeOpacity={0.85}>
            <MaterialCommunityIcons name="plus" size={20} color={COLORS.onPrimary} />
            <Text style={styles.addBtnText}>Nuevo</Text>
          </TouchableOpacity>
        </View>

        {/* ── FILTRO CATEGORÍAS ── */}
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryPill}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesList}
        />

        {/* ── LISTA DE PRODUCTOS ── */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollPadding}
          showsVerticalScrollIndicator={false}
        >
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={56} color={COLORS.outlineVariant} />
              <Text style={styles.emptyStateTitle}>Sin productos</Text>
              <Text style={styles.emptyStateText}>Agrega un producto con el botón "Nuevo"</Text>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {filteredProducts.map(renderProductCard)}
            </View>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ── BOTTOM NAVIGATION BAR (igual que StaffHome) ── */}
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.navItem} onPress={handleGoToHome}>
            <MaterialCommunityIcons name="home-outline" size={24} color={COLORS.onSurfaceVariant} />
            <Text style={styles.navLabel}>Inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItemActive} onPress={() => { }}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={COLORS.primary} />
            <Text style={styles.navLabelActive}>Menú</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={handleGoToAnalytics}>
            <MaterialCommunityIcons name="chart-bar" size={24} color={COLORS.onSurfaceVariant} />
            <Text style={styles.navLabel}>Estadisticas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={handleGoToProfile}>
            <MaterialCommunityIcons name="account-outline" size={24} color={COLORS.onSurfaceVariant} />
            <Text style={styles.navLabel}>Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* ── MODAL: CREAR / EDITAR ── */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={COLORS.onSurface} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Editar producto' : 'Nuevo producto'}
              </Text>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveProduct}>
                <Text style={styles.modalSaveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollPadding} showsVerticalScrollIndicator={false}>
              {/* Preview de imagen */}
              <View style={styles.imagePreviewWrap}>
                <Image
                  source={{ uri: previewImage }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={styles.imagePreviewGradient} />
                <View style={styles.imagePreviewLabel}>
                  <MaterialCommunityIcons name="image-outline" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.imagePreviewLabelText}>Vista previa</Text>
                </View>
              </View>

              {/* ── SECCIÓN: INFO BÁSICA ── */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>
                  <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.primary} /> Información básica
                </Text>

                <Text style={styles.fieldLabel}>Nombre del producto *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Chilaquiles Verdes"
                  placeholderTextColor={`${COLORS.onSurfaceVariant}60`}
                  value={formData.name}
                  onChangeText={text => setFormData(prev => ({ ...prev, name: text }))}
                />

                <Text style={styles.fieldLabel}>Descripción</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe brevemente el platillo..."
                  placeholderTextColor={`${COLORS.onSurfaceVariant}60`}
                  value={formData.description}
                  onChangeText={text => setFormData(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.fieldLabel}>Precio base (MXN) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.00"
                  placeholderTextColor={`${COLORS.onSurfaceVariant}60`}
                  value={formData.basePrice}
                  onChangeText={text => setFormData(prev => ({ ...prev, basePrice: text }))}
                  keyboardType="numeric"
                />

                <Text style={styles.fieldLabel}>URL de imagen</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://... (opcional)"
                  placeholderTextColor={`${COLORS.onSurfaceVariant}60`}
                  value={formData.image}
                  onChangeText={text => setFormData(prev => ({ ...prev, image: text }))}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={styles.fieldLabel}>Categoría *</Text>
                {renderFormCategorySelector()}

                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.switchLabel}>Disponible en menú</Text>
                    <Text style={styles.switchSub}>Los estudiantes pueden verlo y ordenarlo</Text>
                  </View>
                  <Switch
                    value={formData.available}
                    onValueChange={v => setFormData(prev => ({ ...prev, available: v }))}
                    trackColor={{ false: COLORS.surfaceContainerHighest, true: `${COLORS.primary}80` }}
                    thumbColor={formData.available ? COLORS.primary : COLORS.outline}
                  />
                </View>
              </View>

              {/* ── SECCIÓN: INGREDIENTES ── */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.formSectionTitle}>
                    <MaterialCommunityIcons name="food-variant" size={14} color={COLORS.primary} /> Ingredientes base
                  </Text>
                  <TouchableOpacity style={styles.addRowBtn} onPress={addIngredient}>
                    <MaterialCommunityIcons name="plus" size={14} color={COLORS.primary} />
                    <Text style={styles.addRowBtnText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
                {baseIngredients.length === 0 && (
                  <Text style={styles.emptyHint}>Sin ingredientes configurados</Text>
                )}
                {baseIngredients.map(ing => (
                  <View key={ing.id} style={styles.listRow}>
                    <TextInput
                      style={[styles.textInput, styles.rowInput, { marginBottom: 0 }]}
                      placeholder="Nombre del ingrediente"
                      placeholderTextColor={`${COLORS.onSurfaceVariant}60`}
                      value={ing.name}
                      onChangeText={text => updateIngredient(ing.id, { name: text })}
                    />
                    <View style={styles.rowMeta}>
                      <Text style={styles.rowMetaLabel}>Removible</Text>
                      <Switch
                        value={ing.removable}
                        onValueChange={v => updateIngredient(ing.id, { removable: v })}
                        trackColor={{ false: COLORS.surfaceContainerHighest, true: `${COLORS.primary}80` }}
                        thumbColor={ing.removable ? COLORS.primary : COLORS.outline}
                        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                      />
                    </View>
                    <TouchableOpacity style={styles.deleteRowBtn} onPress={() => removeIngredient(ing.id)}>
                      <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* ── SECCIÓN: TAMAÑOS ── */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.formSectionTitle}>
                    <MaterialCommunityIcons name="resize" size={14} color={COLORS.primary} /> Tamaños
                  </Text>
                  <TouchableOpacity style={styles.addRowBtn} onPress={addSize}>
                    <MaterialCommunityIcons name="plus" size={14} color={COLORS.primary} />
                    <Text style={styles.addRowBtnText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
                {availableSizes.length === 0 && (
                  <Text style={styles.emptyHint}>Sin tamaños (precio único)</Text>
                )}
                {availableSizes.map(size => (
                  <View key={size.id} style={styles.listRow}>
                    <TextInput
                      style={[styles.textInput, styles.rowInput, { marginBottom: 0 }]}
                      placeholder="Nombre (ej. Grande)"
                      placeholderTextColor={`${COLORS.onSurfaceVariant}60`}
                      value={size.name}
                      onChangeText={text => updateSize(size.id, { name: text })}
                    />
                    <TextInput
                      style={[styles.textInput, styles.priceInput, { marginBottom: 0 }]}
                      placeholder="+$0"
                      placeholderTextColor={`${COLORS.onSurfaceVariant}60`}
                      value={size.price === 0 ? '' : size.price.toString()}
                      onChangeText={text => updateSize(size.id, { price: parseFloat(text) || 0 })}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.deleteRowBtn} onPress={() => removeSize(size.id)}>
                      <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* ── SECCIÓN: EXTRAS ── */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.formSectionTitle}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={14} color={COLORS.primary} /> Extras opcionales
                  </Text>
                  <TouchableOpacity style={styles.addRowBtn} onPress={addExtra}>
                    <MaterialCommunityIcons name="plus" size={14} color={COLORS.primary} />
                    <Text style={styles.addRowBtnText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
                {availableExtras.length === 0 && (
                  <Text style={styles.emptyHint}>Sin extras disponibles</Text>
                )}
                {availableExtras.map(extra => (
                  <View key={extra.id} style={styles.listRow}>
                    <TextInput
                      style={[styles.textInput, styles.rowInput, { marginBottom: 0 }]}
                      placeholder="Nombre del extra"
                      placeholderTextColor={`${COLORS.onSurfaceVariant}60`}
                      value={extra.name}
                      onChangeText={text => updateExtra(extra.id, { name: text })}
                    />
                    <TextInput
                      style={[styles.textInput, styles.priceInput, { marginBottom: 0 }]}
                      placeholder="+$0"
                      placeholderTextColor={`${COLORS.onSurfaceVariant}60`}
                      value={extra.price === 0 ? '' : extra.price.toString()}
                      onChangeText={text => updateExtra(extra.id, { price: parseFloat(text) || 0 })}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.deleteRowBtn} onPress={() => removeExtra(extra.id)}>
                      <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBottomBtn} onPress={handleSaveProduct} activeOpacity={0.85}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={styles.saveBottomGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <MaterialCommunityIcons name="content-save-outline" size={20} color={COLORS.onPrimary} />
                  <Text style={styles.saveBottomText}>
                    {editingProduct ? 'Guardar cambios' : 'Crear producto'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={{ height: 60 }} />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  // Top Bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: `${COLORS.outlineVariant}40` },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceContainer },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -0.3 },
  topBarSub: { fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.onPrimary },

  // Categories
  categoriesList: { maxHeight: 56, backgroundColor: COLORS.surface },
  categoriesContainer: { gap: 10, paddingHorizontal: 20, paddingVertical: 10 },
  categoryPill: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999, backgroundColor: COLORS.surfaceContainerHigh },
  categoryPillActive: { backgroundColor: COLORS.primary },
  categoryPillText: { fontSize: 13, fontWeight: '500', color: COLORS.onSurfaceVariant },
  categoryPillTextActive: { color: COLORS.onPrimary, fontWeight: '600' },

  // Scroll
  scrollContent: { flex: 1 },
  scrollPadding: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  emptyStateText: { fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center' },

  // Product Grid
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: { backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 16, overflow: 'hidden', flexDirection: 'column', width: '47.5%', shadowColor: COLORS.onSurface, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3, borderWidth: 1, borderColor: `${COLORS.outlineVariant}30` },
  productCardOff: { opacity: 0.65 },
  productImageWrap: { width: '100%', height: 120, position: 'relative' },
  productImage: { width: '100%', height: 120 },
  agotadoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  agotadoText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase' },
  categoryBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  categoryBadgeText: { fontSize: 8, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  switchOverlay: { position: 'absolute', top: 4, right: 2 },
  productBody: { padding: 10, gap: 6 },
  productName: { fontSize: 13, fontWeight: '700', color: COLORS.onSurface },
  productDescription: { fontSize: 11, color: COLORS.onSurfaceVariant, lineHeight: 15 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  featureBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: `${COLORS.primary}12`, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  featureBadgeText: { fontSize: 8, fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  productActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconActionBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: `${COLORS.primary}12`, alignItems: 'center', justifyContent: 'center' },
  iconActionBtnDanger: { backgroundColor: `${COLORS.error}12` },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: `${COLORS.surface}CC`,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
  },
  navItem: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, opacity: 0.6 },
  navItemActive: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: `${COLORS.primary}1A`, borderRadius: 12 },
  navLabel: { fontSize: 10, fontWeight: '500', color: COLORS.onSurfaceVariant, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  navLabelActive: { fontSize: 10, fontWeight: '500', color: COLORS.primary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: `${COLORS.outlineVariant}40` },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.onSurface },
  modalSaveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  modalSaveBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.onPrimary },
  modalScroll: { flex: 1 },
  modalScrollPadding: { paddingHorizontal: 16, paddingTop: 0 },
  imagePreviewWrap: { height: 180, borderRadius: 0, overflow: 'hidden', position: 'relative', marginHorizontal: -16, marginBottom: 20 },
  imagePreview: { width: '100%', height: '100%' },
  imagePreviewGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  imagePreviewLabel: { position: 'absolute', bottom: 12, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  imagePreviewLabelText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  formSection: { marginBottom: 24, backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: `${COLORS.outlineVariant}25` },
  formSectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.onSurfaceVariant, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: { backgroundColor: COLORS.surfaceContainerLow, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.onSurface, marginBottom: 12, borderWidth: 1, borderColor: `${COLORS.outlineVariant}40` },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: COLORS.onSurface },
  switchSub: { fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 2 },
  formCategoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  formCategoryPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, backgroundColor: COLORS.surfaceContainerHigh, borderWidth: 1, borderColor: `${COLORS.outlineVariant}40` },
  formCategoryPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  formCategoryText: { fontSize: 13, fontWeight: '500', color: COLORS.onSurfaceVariant },
  formCategoryTextActive: { color: COLORS.onPrimary, fontWeight: '700' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.primary}12`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  addRowBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  emptyHint: { fontSize: 13, color: COLORS.outline, fontStyle: 'italic', paddingVertical: 4 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rowInput: { flex: 1 },
  priceInput: { width: 70, textAlign: 'center' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMetaLabel: { fontSize: 11, color: COLORS.onSurfaceVariant },
  deleteRowBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: `${COLORS.error}12`, alignItems: 'center', justifyContent: 'center' },
  saveBottomBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  saveBottomGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  saveBottomText: { fontSize: 16, fontWeight: '700', color: COLORS.onPrimary },
});