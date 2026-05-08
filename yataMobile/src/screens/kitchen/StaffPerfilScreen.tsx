// src/screens/kitchen/StaffPerfilScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  Alert,
  Linking,
  StatusBar,
  BackHandler,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  surfaceContainerHigh: '#E7E8E9',
  surfaceContainerHighest: '#E1E3E4',
  outlineVariant: '#CCC3D8',
  error: '#BA1A1A',
};

interface CafeteriaConfig {
  name: string;
  schedule: string;
  maintenanceMode: boolean;
}

const SUPPORT_CONTACT = {
  email: 'soporte@yata.com',
  phone: '+52 55 1234 5678',
};

export default function StaffPerfilScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<CafeteriaConfig>({
    name: 'Cafetería LSC & LIDTS',
    schedule: '07:00 - 19:00',
    maintenanceMode: false,
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Estados para los modales de edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<'name' | 'schedule'>('name');
  const [editValue, setEditValue] = useState('');
  const [updating, setUpdating] = useState(false);

  // Cargar usuario real y configuración
  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await Session.getUser();
        console.log('👤 Usuario cargado en StaffPerfilScreen:', userData);
        setUser(userData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ✅ Prevenir retroceso en Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // 🔧 HANDLERS
  const openEditModal = (field: 'name' | 'schedule') => {
    setEditField(field);
    setEditValue(field === 'name' ? config.name : config.schedule);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      Alert.alert('Campo vacío', 'Por favor ingresa un valor válido.');
      return;
    }

    setUpdating(true);

    try {
      if (editField === 'name') {
        setConfig((prev) => ({ ...prev, name: editValue.trim() }));
        Alert.alert('✅ Nombre actualizado', `Ahora se llama: ${editValue.trim()}`);
      } else {
        // Validar formato de horario
        const scheduleRegex = /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/;
        if (!scheduleRegex.test(editValue.trim())) {
          Alert.alert(
            'Formato inválido',
            'Usa el formato: HH:MM - HH:MM (ej: 08:00 - 20:00)'
          );
          setUpdating(false);
          return;
        }
        setConfig((prev) => ({ ...prev, schedule: editValue.trim() }));
        Alert.alert('✅ Horario actualizado', `Nuevo horario: ${editValue.trim()}`);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la configuración');
    } finally {
      setUpdating(false);
      setEditModalVisible(false);
      setEditValue('');
    }
  };

  const handleToggleMaintenance = (value: boolean) => {
    setMaintenanceMode(value);
    console.log(`🔧 Modo mantenimiento: ${value ? 'ACTIVADO' : 'DESACTIVADO'}`);

    if (value) {
      Alert.alert(
        'Modo Mantenimiento Activado',
        'Los estudiantes no podrán realizar nuevos pedidos hasta que desactives este modo.'
      );
    } else {
      Alert.alert(
        'Modo Mantenimiento Desactivado',
        'Los estudiantes ya pueden realizar pedidos nuevamente.'
      );
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contacto de Soporte',
      '¿Cómo deseas contactar al equipo de soporte técnico?',
      [
        { text: '📧 Email', onPress: () => Linking.openURL(`mailto:${SUPPORT_CONTACT.email}`) },
        { text: '📞 Teléfono', onPress: () => Linking.openURL(`tel:${SUPPORT_CONTACT.phone}`) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
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
                routes: [{ name: 'Splash' }],
              });
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Splash' }],
              });
            }
          },
        },
      ]
    );
  };

  // Obtener datos del usuario real - MISMO MÉTODO QUE USA EL ESTUDIANTE
  const displayName = user?.name?.split(' ')[0] || 'Staff';

  // 🔥 ESTA ES LA CLAVE - Usar el mismo método que funciona en el estudiante
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?background=630ED4&color=fff&name=${encodeURIComponent(displayName)}`;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.container}>

        {/* ── TOP APP BAR ── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
          <View style={styles.topBarLeft}>
            {/* 🔥 Image con manejo de error */}
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              onError={() => {
                console.log('Error cargando avatar, usando fallback');
                setImageError(true);
              }}
            />
            <View>
              <Text style={styles.topBarTitle}>Cocina</Text>
              <Text style={styles.topBarSubtitle}>{displayName}</Text>
            </View>
          </View>
        </View>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollPadding}
          showsVerticalScrollIndicator={false}
        >

          {/* Editorial Header */}
          <View style={styles.headerSection}>
            <Text style={styles.adminLabel}>Administración</Text>
            <Text style={styles.headerTitle}>Configuración de Cafetería</Text>
            <Text style={styles.headerSubtitle}>
              Gestiona los parámetros globales de tu punto de servicio.
            </Text>
          </View>

          {/* General Settings Bento Grid */}
          <View style={styles.settingsGrid}>

            {/* Nombre de Cafetería */}
            <TouchableOpacity
              style={styles.settingCard}
              onPress={() => openEditModal('name')}
              activeOpacity={0.8}
            >
              <View style={styles.settingHeader}>
                <MaterialCommunityIcons name="storefront" size={24} color={COLORS.primary} />
                <Text style={styles.editLink}>EDITAR</Text>
              </View>
              <Text style={styles.settingLabel}>Nombre</Text>
              <Text style={styles.settingValue}>{config.name}</Text>
            </TouchableOpacity>

            {/* Horario de Servicio */}
            <TouchableOpacity
              style={[styles.settingCard, styles.settingCardSecondary]}
              onPress={() => openEditModal('schedule')}
              activeOpacity={0.8}
            >
              <View style={styles.settingHeader}>
                <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.secondary} />
                <Text style={[styles.editLink, { color: COLORS.secondary }]}>EDITAR</Text>
              </View>
              <Text style={styles.settingLabel}>Horario de Servicio</Text>
              <Text style={[styles.settingValue, styles.monoFont]}>{config.schedule}</Text>
            </TouchableOpacity>
          </View>

          {/* Maintenance Mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estado del Sistema</Text>
            <View style={styles.maintenanceCard}>
              <View style={styles.maintenanceContent}>
                <MaterialCommunityIcons
                  name="wrench"
                  size={20}
                  color={maintenanceMode ? COLORS.error : COLORS.onSurfaceVariant}
                />
                <View>
                  <Text style={styles.maintenanceTitle}>Modo Mantenimiento</Text>
                  <Text style={styles.maintenanceSubtitle}>
                    {maintenanceMode
                      ? 'Pedidos pausados temporalmente'
                      : 'Sistema operativo normal'}
                  </Text>
                </View>
              </View>
              <Switch
                value={maintenanceMode}
                onValueChange={handleToggleMaintenance}
                trackColor={{ false: COLORS.surfaceContainerHighest, true: COLORS.error }}
                thumbColor={Platform.OS === 'ios' ? undefined : COLORS.onPrimary}
                ios_backgroundColor={COLORS.surfaceContainerHighest}
              />
            </View>
          </View>

          {/* Support Contact */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.supportCard}
              onPress={handleContactSupport}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="headphones" size={24} color={COLORS.primary} />
              <View style={styles.supportContent}>
                <Text style={styles.supportTitle}>Contacto de Soporte</Text>
                <Text style={styles.supportSubtitle}>
                  ¿Problemas técnicos? Contacta al equipo de YaTa
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="logout" size={20} color={COLORS.error} />
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>

          {/* Version Info */}
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>v2.4.1 Build AC-772</Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* ── MODAL DE EDICIÓN ── */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Editar {editField === 'name' ? 'Nombre' : 'Horario'}
                </Text>
                <TouchableOpacity
                  onPress={() => setEditModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={editField === 'name' ? 'Nombre de la cafetería' : 'Ej: 08:00 - 20:00'}
                placeholderTextColor={COLORS.outlineVariant}
                autoFocus={true}
              />

              {editField === 'schedule' && (
                <Text style={styles.modalHint}>
                  Formato sugerido: HH:MM - HH:MM (ejemplo: 09:00 - 18:00)
                </Text>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSaveEdit}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color={COLORS.onPrimary} />
                  ) : (
                    <Text style={styles.modalButtonSaveText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── BOTTOM NAVIGATION BAR ── */}
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.popToTop()}>
            <MaterialCommunityIcons name="home-outline" size={24} color={COLORS.onSurfaceVariant} />
            <Text style={styles.navLabel}>Inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('GestionMenu')}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={COLORS.onSurfaceVariant} />
            <Text style={styles.navLabel}>Menú</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Estadisticas')}>
            <MaterialCommunityIcons name="chart-bar" size={24} color={COLORS.onSurfaceVariant} />
            <Text style={styles.navLabel}>Panel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItemActive} onPress={() => navigation.navigate('StaffPerfil')}>
            <MaterialCommunityIcons name="account" size={24} color={COLORS.primary} />
            <Text style={styles.navLabelActive}>Perfil</Text>
          </TouchableOpacity>
        </View>

      </View>
    </>
  );
}

// 🎨 ESTILOS (iguales a los que ya tenías)
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.outlineVariant}40`,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  topBarSubtitle: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { flex: 1 },
  scrollPadding: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  headerSection: {
    marginBottom: 32,
  },
  adminLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.onSurface,
    letterSpacing: -1,
    lineHeight: 40,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    marginTop: 8,
  },
  settingsGrid: {
    gap: 16,
    marginBottom: 32,
  },
  settingCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 20,
    padding: 24,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  settingCardSecondary: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  settingValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  monoFont: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: 16,
  },
  maintenanceCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  maintenanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  maintenanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  maintenanceSubtitle: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
  supportCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  supportSubtitle: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${COLORS.error}0D`,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.error}1A`,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: 24,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '500',
    color: `${COLORS.onSurfaceVariant}40`,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bottomSpacer: { height: 80 },
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
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.outlineVariant}40`,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    opacity: 0.6,
  },
  navItemActive: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: `${COLORS.primary}1A`,
    borderRadius: 12,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  navLabelActive: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.primary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.onSurface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: 12,
  },
  modalHint: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.surfaceContainerHighest,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  modalButtonSave: {
    backgroundColor: COLORS.primary,
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
});