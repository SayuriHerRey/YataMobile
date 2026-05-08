// src/screens/kitchen/StaffHomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Session, AppUser } from '../../services/config';
import { orderService, OrderOut } from '../../services/orderService';

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
  outline: '#7B7487',
  outlineVariant: '#CCC3D8',
  green: '#16A34A',
  orange: '#F59E0B',
};

interface Metrics {
  received: number;
  completed: number;
  pending: number;
}

export default function StaffHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    received: 0,
    completed: 0,
    pending: 0,
  });

  // Cargar usuario real
  const loadUserData = async () => {
    try {
      const userData = await Session.getUser();
      if (!userData) {
        console.warn('⚠️ No se encontró información del usuario');
        return;
      }
      setUser(userData);
    } catch (err) {
      console.error('Error cargando usuario:', err);
    }
  };

  // Cargar métricas desde órdenes activas
  const loadMetrics = async () => {
    try {
      const activeOrders: OrderOut[] = await orderService.getActiveOrders();

      const received = activeOrders.filter((o) => o.status === 'recibido').length;
      const pending = activeOrders.filter((o) => o.status === 'en_preparacion').length;
      const completed = activeOrders.filter((o) => o.status === 'listo').length;

      setMetrics({ received, pending, completed });
    } catch (err) {
      console.error('Error cargando métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar datos al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadMetrics();
    }, [])
  );

  // Carga inicial + refresco automático
  useEffect(() => {
    loadUserData();
    loadMetrics();

    const interval = setInterval(() => {
      loadMetrics();
    }, 10000); // cada 10 segundos

    return () => clearInterval(interval);
  }, []);

  // Navegación
  const handleGoToMenu = () => navigation.navigate('GestionMenu');
  const handleGoToAnalytics = () => navigation.navigate('Estadisticas');
  const handleGoToProfile = () => navigation.navigate('StaffPerfil');
  const handleOpenKDS = () => navigation.navigate('KDS');

  // Avatar dinámico
  const displayName = user?.name?.split(' ')[0] || 'Staff';
  const avatarUrl =
    user?.avatar ||
    `https://ui-avatars.com/api/?background=630ED4&color=fff&name=${encodeURIComponent(displayName)}`;

  if (loading && !user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando panel de cocina...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topBarLeft}>
          <MaterialCommunityIcons name="chef-hat" size={24} color={COLORS.primary} />
          <Text style={styles.topBarTitle}>Cocina</Text>
        </View>
        <View style={styles.topBarRight}>
          <Text style={styles.userName}>{displayName}</Text>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollPadding}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>¡Buen día, {displayName}!</Text>
          <Text style={styles.welcomeTitle}>Panel de control</Text>
        </View>

        {/* KDS Card */}
        <TouchableOpacity style={styles.kdsCard} onPress={handleOpenKDS} activeOpacity={0.9}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryContainer]}
            style={styles.kdsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.kdsContent}>
              <View style={styles.kdsHeader}>
                <View style={styles.kdsIconContainer}>
                  <MaterialCommunityIcons name="tablet-dashboard" size={30} color={COLORS.onPrimary} />
                </View>
                <MaterialCommunityIcons name="arrow-right" size={24} color={COLORS.onPrimary} opacity={0.7} />
              </View>
              <View style={styles.kdsText}>
                <Text style={styles.kdsTitle}>Comandas Activas</Text>
                <Text style={styles.kdsSubtitle}>Gestiona los pedidos en tiempo real</Text>
              </View>
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={100}
                color={COLORS.onPrimary}
                style={styles.kdsDecorativeIcon}
                opacity={0.08}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Metrics */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.metricCardReceived]}>
            <View style={styles.metricHeader}>
              <MaterialCommunityIcons name="inbox-outline" size={18} color={COLORS.primary} />
              <Text style={styles.metricLabel}>RECIBIDOS</Text>
            </View>
            <Text style={styles.metricValue}>{metrics.received}</Text>
            <Text style={styles.metricDescription}>Por preparar</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardPending]}>
            <View style={styles.metricHeader}>
              <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.orange} />
              <Text style={[styles.metricLabel, { color: COLORS.orange }]}>EN PREPARACIÓN</Text>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.orange }]}>{metrics.pending}</Text>
            <Text style={styles.metricDescription}>En proceso</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardCompleted]}>
            <View style={styles.metricHeader}>
              <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.green} />
              <Text style={[styles.metricLabel, { color: COLORS.green }]}>LISTOS</Text>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.green }]}>{metrics.completed}</Text>
            <Text style={styles.metricDescription}>Listos para entregar</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.navItemActive} onPress={() => navigation.popToTop()}>
          <MaterialCommunityIcons name="home" size={24} color={COLORS.primary} />
          <Text style={styles.navLabelActive}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleGoToMenu}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={COLORS.onSurfaceVariant} />
          <Text style={styles.navLabel}>Menú</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleGoToAnalytics}>
          <MaterialCommunityIcons name="chart-bar" size={24} color={COLORS.onSurfaceVariant} />
          <Text style={styles.navLabel}>Estadísticas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleGoToProfile}>
          <MaterialCommunityIcons name="account-outline" size={24} color={COLORS.onSurfaceVariant} />
          <Text style={styles.navLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ==================== ESTILOS ==================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: COLORS.onSurfaceVariant, marginTop: 12 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userName: { fontSize: 14, fontWeight: '600', color: COLORS.onSurfaceVariant },
  avatar: { width: 40, height: 40, borderRadius: 20 },

  scrollContent: { flex: 1 },
  scrollPadding: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 },

  welcomeSection: { marginBottom: 24 },
  greeting: { fontSize: 14, fontWeight: '500', color: COLORS.onSurfaceVariant, marginBottom: 4 },
  welcomeTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -1 },

  kdsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  kdsGradient: { padding: 28 },
  kdsContent: { position: 'relative' },
  kdsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  kdsIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kdsText: { flex: 1 },
  kdsTitle: { fontSize: 22, fontWeight: '700', color: COLORS.onPrimary, marginBottom: 6 },
  kdsSubtitle: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  kdsDecorativeIcon: { position: 'absolute', right: -20, bottom: -30 },

  metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  metricCardReceived: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  metricCardPending: { borderLeftWidth: 4, borderLeftColor: COLORS.orange },
  metricCardCompleted: { borderLeftWidth: 4, borderLeftColor: COLORS.green },

  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  metricValue: { fontSize: 30, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  metricDescription: { fontSize: 11, color: COLORS.onSurfaceVariant },

  bottomSpacer: { height: 20 },

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
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainer,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  navItem: { alignItems: 'center', paddingVertical: 8 },
  navItemActive: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: `${COLORS.primary}1A`,
    borderRadius: 12,
  },
  navLabel: { fontSize: 10, fontWeight: '500', color: COLORS.onSurfaceVariant, marginTop: 4 },
  navLabelActive: { fontSize: 10, fontWeight: '600', color: COLORS.primary, marginTop: 4 },
});