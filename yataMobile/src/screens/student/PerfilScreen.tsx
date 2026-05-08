// src/screens/student/PerfilScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Platform,
  Alert,
  Modal,
  TextInput,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CompositeNavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentTabParamList, StudentStackParamList } from '../../types';
import { Session, AppUser, SessionUser } from '../../services/config';
import { notificationService } from '../../services/notificationService';
import NotificationDrawer from '../../components/NotificationDrawer';

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
  surfaceContainerHigh: '#E7E8E9',
  outlineVariant: '#CCC3D8',
  error: '#BA1A1A',
  green: '#16A34A',
};

type PerfilNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<StudentTabParamList, 'Perfil'>,
  NativeStackNavigationProp<StudentStackParamList>
>;

export default function PerfilScreen() {
  const navigation = useNavigation<PerfilNavigationProp>();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [savedMethod, setSavedMethod] = useState<'card' | 'cash'>('cash');
  const [savedCardLast4, setSavedCardLast4] = useState<string | null>(null);
  const [savedCardHolder, setSavedCardHolder] = useState<string>('');
  const [editingCard, setEditingCard] = useState(false);
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
  });

  const loadUserData = async () => {
    try {
      const userData = await Session.getUser();

      if (!userData) {
        throw new Error('Usuario no encontrado');
      }

      setUser(userData);
      const count = await notificationService.getUnreadCount(userData.id);
      setUnreadCount(count);
      // Cargar método de pago guardado
      const raw = userData as any;
      setSavedMethod(raw?.default_payment_method === 'card' ? 'card' : 'cash');
      if (raw?.saved_card_last4) {
        setSavedCardLast4(raw.saved_card_last4);
        setSavedCardHolder(raw.saved_card_holder || '');
      }
    } catch (err) {
      console.error('Error loading user:', err);
      Alert.alert('Error', 'No se pudieron cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  useEffect(() => {
    loadUserData();
  }, []);

  const handleEditAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para cambiar la foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setTempAvatar(result.assets[0].uri);
      Alert.alert(
        'Actualizar foto',
        '¿Deseas actualizar tu foto de perfil?',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => setTempAvatar(null) },
          {
            text: 'Actualizar',
            onPress: async () => {
              try {
                setUser(prev => prev ? { ...prev, avatar: result.assets[0].uri } : null);
                setTempAvatar(null);
                Alert.alert('✅ Foto actualizada', 'Tu foto de perfil ha sido actualizada correctamente.');
              } catch (err) {
                Alert.alert('Error', 'No se pudo actualizar la foto');
              }
            },
          },
        ]
      );
    }
  };

  const handleEditProfile = () => {
    if (user) {
      setEditForm({
        name: user.name,
        phone: user.phone,
      });
    }
    setEditProfileModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    setIsLoading(true);

    try {
      setUser(prev => prev ? {
        ...prev,
        name: editForm.name,
        phone: editForm.phone,
      } : null);

      Alert.alert('✅ Perfil actualizado', 'Tu información ha sido actualizada correctamente.');
      setEditProfileModalVisible(false);
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentMethod = () => {
    setEditingCard(false);
    setCardForm({ number: '', expiry: '', cvv: '', name: savedCardHolder });
    setPaymentModalVisible(true);
  };

  const handleSavePaymentMethod = async () => {
    setIsLoading(true);
    try {
      const updates: any = { default_payment_method: savedMethod };
      if (savedMethod === 'card' && editingCard) {
        const rawNum = cardForm.number.replace(/\s/g, '');
        if (rawNum.length < 16) {
          Alert.alert('Tarjeta inválida', 'Ingresa los 16 dígitos.');
          setIsLoading(false); return;
        }
        const last4 = rawNum.slice(-4);
        updates.saved_card_last4 = last4;
        updates.saved_card_holder = cardForm.name.toUpperCase();
        setSavedCardLast4(last4);
        setSavedCardHolder(cardForm.name.toUpperCase());
      } else if (savedMethod === 'cash') {
        updates.saved_card_last4 = null;
        updates.saved_card_holder = null;
        setSavedCardLast4(null);
        setSavedCardHolder('');
      }
      await Session.updateUser(updates);
      setPaymentModalVisible(false);
      Alert.alert('✅ Guardado', 'Método de pago actualizado correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el método de pago.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setPushEnabled(value);
    if (value && user) {
      await notificationService.registerDeviceToken(user.id);
    }
  };

  const handleSupport = () => {
    Alert.alert('Soporte', 'Contacta con la cafetería al: (55) 1234-5678');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await Session.clearSession();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Splash' } as any],
              });
            } catch (err) {
              console.error('Error al cerrar sesión:', err);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Splash' } as any],
              });
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <MaterialCommunityIcons name="account-off" size={64} color={COLORS.outlineVariant} />
        <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadUserData}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const avatarUrl = tempAvatar || user.avatar || `https://ui-avatars.com/api/?background=630ED4&color=fff&name=${encodeURIComponent(user.name)}`;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <SafeAreaView style={styles.container}>

        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8 }]}>
          <View style={styles.topBarLeft}>
            <Image source={{ uri: avatarUrl }} style={styles.avatarSmall} />
            <Text style={styles.topBarTitle}>Perfil</Text>
          </View>

          <NotificationDrawer
            userId={user.id}
            unreadCount={unreadCount}
            onUnreadChange={setUnreadCount}
          />
        </View>

        {/* Main Content */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollPadding}
          showsVerticalScrollIndicator={false}
        >
          {/* Identity Section */}
          <View style={styles.identitySection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handleEditAvatar}>
              <Image source={{ uri: avatarUrl }} style={styles.avatarLarge} />
              <View style={styles.editBadge}>
                <MaterialCommunityIcons name="camera" size={14} color={COLORS.onPrimary} />
              </View>
            </TouchableOpacity>

            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>

            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <MaterialCommunityIcons name="pencil" size={16} color={COLORS.primary} />
              <Text style={styles.editProfileButtonText}>Editar perfil</Text>
            </TouchableOpacity>

            {/* Student Info */}
            <View style={styles.studentInfo}>
              <View style={styles.studentInfoRow}>
                <MaterialCommunityIcons name="phone" size={16} color={COLORS.onSurfaceVariant} />
                <Text style={styles.studentInfoText}>{user.phone || 'No registrado'}</Text>
              </View>
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Preferencias</Text>

            <View style={styles.preferencesGrid}>
              <TouchableOpacity style={styles.preferenceCard} onPress={handlePaymentMethod} activeOpacity={0.8}>
                <View style={styles.preferenceContent}>
                  <View style={[styles.preferenceIcon, { backgroundColor: `${COLORS.secondary}1A` }]}>
                    <MaterialCommunityIcons name="credit-card" size={20} color={COLORS.secondary} />
                  </View>
                  <View style={styles.preferenceText}>
                    <Text style={styles.preferenceTitle}>Métodos de pago</Text>
                    <Text style={styles.preferenceValue}>
                      {savedMethod === 'card' && savedCardLast4
                        ? `Tarjeta •••• ${savedCardLast4}`
                        : savedMethod === 'card'
                          ? 'Tarjeta de crédito/débito'
                          : 'Efectivo por defecto'}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>

              <View style={styles.preferenceCard}>
                <View style={styles.preferenceContent}>
                  <View style={[styles.preferenceIcon, { backgroundColor: `${COLORS.primary}1A` }]}>
                    <MaterialCommunityIcons name="bell-ring" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.preferenceText}>
                    <Text style={styles.preferenceTitle}>Notificaciones push</Text>
                    <Text style={styles.preferenceValue}>Alertas de pedido listo</Text>
                  </View>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: COLORS.surfaceContainerHigh, true: COLORS.primary }}
                  thumbColor={Platform.OS === 'ios' ? undefined : COLORS.onPrimary}
                />
              </View>
            </View>
          </View>

          {/* Utility Section */}
          <View style={styles.utilitySection}>
            <TouchableOpacity style={styles.utilityButton} onPress={handleSupport} activeOpacity={0.8}>
              <Text style={styles.utilityButtonText}>Soporte / Contacto cafetería</Text>
              <MaterialCommunityIcons name="headphones" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
              <MaterialCommunityIcons name="logout" size={20} color={COLORS.error} />
              <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editProfileModalVisible}
          onRequestClose={() => setEditProfileModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.editProfileModal]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar perfil</Text>
                <TouchableOpacity onPress={() => setEditProfileModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.editInput}
                  placeholder="Nombre completo"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                />

                <TextInput
                  style={styles.editInput}
                  placeholder="Teléfono"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                  keyboardType="phone-pad"
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                />

                <View style={styles.editButtonsRow}>
                  <TouchableOpacity
                    style={[styles.editButton, styles.cancelEditButton]}
                    onPress={() => setEditProfileModalVisible(false)}
                  >
                    <Text style={styles.cancelEditButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.editButton, styles.saveEditButton]}
                    onPress={handleSaveProfile}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={COLORS.onPrimary} />
                    ) : (
                      <Text style={styles.saveEditButtonText}>Guardar cambios</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ✅ Modal de Métodos de Pago */}
        <Modal
          animationType="slide"
          transparent
          visible={paymentModalVisible}
          onRequestClose={() => setPaymentModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.editProfileModal]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Métodos de pago</Text>
                <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Efectivo */}
                <TouchableOpacity
                  style={[styles.methodOption, savedMethod === 'cash' && styles.methodOptionSelected]}
                  onPress={() => setSavedMethod('cash')}
                  activeOpacity={0.8}
                >
                  <View style={styles.methodOptionLeft}>
                    <MaterialCommunityIcons
                      name="cash"
                      size={26}
                      color={savedMethod === 'cash' ? COLORS.primary : COLORS.onSurfaceVariant}
                    />
                    <View>
                      <Text style={styles.methodOptionTitle}>Efectivo</Text>
                      <Text style={styles.methodOptionSub}>Paga al recoger en ventanilla</Text>
                    </View>
                  </View>
                  <View style={styles.radioOuter}>
                    {savedMethod === 'cash' && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>

                {/* Tarjeta */}
                <TouchableOpacity
                  style={[styles.methodOption, savedMethod === 'card' && styles.methodOptionSelected]}
                  onPress={() => setSavedMethod('card')}
                  activeOpacity={0.8}
                >
                  <View style={styles.methodOptionLeft}>
                    <MaterialCommunityIcons
                      name="credit-card"
                      size={26}
                      color={savedMethod === 'card' ? COLORS.primary : COLORS.onSurfaceVariant}
                    />
                    <View>
                      <Text style={styles.methodOptionTitle}>Tarjeta de crédito/débito</Text>
                      <Text style={styles.methodOptionSub}>
                        {savedCardLast4 ? `Guardada: •••• ${savedCardLast4}` : 'Sin tarjeta guardada'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.radioOuter}>
                    {savedMethod === 'card' && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>

                {/* Formulario tarjeta */}
                {savedMethod === 'card' && (
                  <View style={styles.cardSection}>
                    {savedCardLast4 && !editingCard ? (
                      <View style={styles.savedCardRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <MaterialCommunityIcons name="credit-card-check" size={20} color="#16A34A" />
                          <Text style={styles.savedCardText}>•••• •••• •••• {savedCardLast4}</Text>
                          {savedCardHolder ? (
                            <Text style={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>{savedCardHolder}</Text>
                          ) : null}
                        </View>
                        <TouchableOpacity onPress={() => setEditingCard(true)}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary }}>Cambiar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant, marginBottom: 8 }}>
                          {savedCardLast4 ? 'Nueva tarjeta' : 'Agregar tarjeta'}
                        </Text>
                        <TextInput
                          style={styles.editInput}
                          placeholder="0000 0000 0000 0000"
                          placeholderTextColor={COLORS.onSurfaceVariant}
                          keyboardType="number-pad"
                          maxLength={19}
                          value={cardForm.number}
                          onChangeText={v => setCardForm(p => ({
                            ...p,
                            number: v.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19)
                          }))}
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TextInput
                            style={[styles.editInput, { flex: 1 }]}
                            placeholder="MM/AA"
                            placeholderTextColor={COLORS.onSurfaceVariant}
                            keyboardType="number-pad"
                            maxLength={5}
                            value={cardForm.expiry}
                            onChangeText={v => setCardForm(p => ({
                              ...p,
                              expiry: v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5)
                            }))}
                          />
                          <TextInput
                            style={[styles.editInput, { flex: 1 }]}
                            placeholder="CVV"
                            placeholderTextColor={COLORS.onSurfaceVariant}
                            keyboardType="number-pad"
                            maxLength={4}
                            secureTextEntry
                            value={cardForm.cvv}
                            onChangeText={v => setCardForm(p => ({ ...p, cvv: v.replace(/\D/g, '').slice(0, 4) }))}
                          />
                        </View>
                        <TextInput
                          style={styles.editInput}
                          placeholder="NOMBRE EN TARJETA"
                          placeholderTextColor={COLORS.onSurfaceVariant}
                          autoCapitalize="characters"
                          value={cardForm.name}
                          onChangeText={v => setCardForm(p => ({ ...p, name: v.toUpperCase() }))}
                        />
                      </>
                    )}
                  </View>
                )}

                <View style={styles.editButtonsRow}>
                  <TouchableOpacity
                    style={[styles.editButton, styles.cancelEditButton]}
                    onPress={() => setPaymentModalVisible(false)}
                  >
                    <Text style={styles.cancelEditButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, styles.saveEditButton]}
                    onPress={handleSavePaymentMethod}
                    disabled={isLoading}
                  >
                    {isLoading
                      ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
                      : <Text style={styles.saveEditButtonText}>Guardar</Text>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.error,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  retryButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainer,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scrollContent: { flex: 1 },
  scrollPadding: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 30,
  },
  identitySection: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: COLORS.surfaceContainerLow,
    backgroundColor: COLORS.surfaceContainer,
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.onSurface,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    opacity: 0.8,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: `${COLORS.primary}1A`,
    borderRadius: 20,
    marginTop: 4,
  },
  editProfileButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  studentInfo: {
    marginTop: 12,
    gap: 8,
    width: '100%',
    paddingHorizontal: 16,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studentInfoText: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  section: {
    marginTop: 24,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.6,
    paddingHorizontal: 4,
  },
  preferencesGrid: {
    gap: 12,
  },
  preferenceCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceText: {
    gap: 2,
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  preferenceValue: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    opacity: 0.7,
  },
  utilitySection: {
    marginTop: 24,
    gap: 12,
    marginBottom: 20,
  },
  utilityButton: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  utilityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  logoutButton: {
    backgroundColor: `${COLORS.error}0D`,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: `${COLORS.error}1A`,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
  },
  bottomSpacer: { height: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  editProfileModal: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  editInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.onSurface,
    marginBottom: 16,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelEditButton: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  cancelEditButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  saveEditButton: {
    backgroundColor: COLORS.primary,
  },
  saveEditButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
  // ── Payment modal styles ──────────────────────────────────────
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  methodOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  methodOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  methodOptionSub: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  cardSection: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  savedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
});