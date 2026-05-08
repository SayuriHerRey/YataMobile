// src/screens/kitchen/EstadisticasScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Session, AppUser } from '../../services/config';
import { analyticsService, DashboardData, TimeRange } from '../../services/analyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#630ED4',
  primaryContainer: '#7C3AED',
  surface: '#F8F9FA',
  onSurface: '#191C1D',
  onSurfaceVariant: '#4A4455',
  surfaceContainer: '#EDEEEF',
  surfaceContainerLow: '#F3F4F5',
  surfaceContainerLowest: '#FFFFFF',
  outlineVariant: '#CCC3D8',
  green: '#16A34A',
};

// Paleta de colores para la gráfica
const BAR_COLORS = ['#630ED4', '#8B5CF6', '#3B82F6', '#14B8A6', '#F59E0B', '#EF4444', '#EC4899'];

const TIME_RANGES = [
  { id: 'today' as TimeRange, label: 'Hoy' },
  { id: 'week' as TimeRange, label: 'Semana' },
  { id: 'month' as TimeRange, label: 'Mes' },
];

// ==================== GRÁFICA DE BARRAS CON COLORES ====================
function BarChart({ data }: { data: { hour: string; value: number }[] }) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const CHART_HEIGHT = 170;

  return (
    <View style={{ marginTop: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, paddingHorizontal: 10, gap: 10 }}>
          {data.map((item, idx) => {
            const heightPercentage = Math.max(10, (item.value / maxVal) * CHART_HEIGHT);
            const color = BAR_COLORS[idx % BAR_COLORS.length];

            return (
              <View key={idx} style={{ alignItems: 'center', width: 46 }}>
                <Text style={[styles.barValue, { color }]}>{item.value}</Text>
                <View
                  style={{
                    width: 32,
                    height: heightPercentage,
                    backgroundColor: color,
                    borderRadius: 10,
                    marginBottom: 6,
                  }}
                />
                <Text style={styles.barLabel}>{item.hour}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function EstadisticasScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [user, setUser] = useState<AppUser | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allProductsVisible, setAllProductsVisible] = useState(false);

  useEffect(() => {
    Session.getUser().then(setUser);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await analyticsService.getDashboard(timeRange);
        setDashboardData(data);
      } catch (error: any) {
        console.error('Error cargando estadísticas:', error);
        Alert.alert('Error', 'No se pudieron cargar las estadísticas');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  const metrics = dashboardData?.metrics ?? { totalOrders: 0, growth: '+0%', avgTicket: 0, avgPrepTime: 0 };
  const hourlyData = dashboardData?.hourly_data ?? [];
  const topProducts = dashboardData?.top_products ?? [];

  const displayName = user?.name?.split(' ')[0] || 'Equipo';
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?background=630ED4&color=fff&name=${encodeURIComponent(displayName)}`;

  const maxOrders = topProducts.length > 0 ? topProducts[0].ordersToday : 1;

  // Navegación (igual que StaffHomeScreen)
  const handleGoToHome = () => navigation.popToTop();
  const handleGoToMenu = () => navigation.navigate('GestionMenu');
  const handleGoToAnalytics = () => navigation.navigate('Estadisticas');
  const handleGoToProfile = () => navigation.navigate('StaffPerfil');
  const handleOpenKDS = () => navigation.navigate('KDS');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topBarLeft}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View>
            <Text style={styles.topBarTitle}>Estadísticas</Text>
            <Text style={styles.topBarSubtitle}>{displayName}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Estadísticas de Venta</Text>

        {/* Selector de período */}
        <View style={styles.timeSelector}>
          {TIME_RANGES.map((range) => (
            <TouchableOpacity
              key={range.id}
              style={[styles.timeBtn, timeRange === range.id && styles.timeBtnActive]}
              onPress={() => setTimeRange(range.id)}
            >
              <Text style={[styles.timeBtnText, timeRange === range.id && styles.timeBtnTextActive]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando datos...</Text>
          </View>
        ) : (
          <>
            {/* Métricas */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricBig}>
                <Text style={styles.metricLabel}>Pedidos Totales</Text>
                <Text style={styles.metricBigValue}>{metrics.totalOrders}</Text>
                <Text style={styles.growth}>{metrics.growth}</Text>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricSmall}>
                  <Text style={styles.metricLabelSmall}>Ticket Promedio</Text>
                  <Text style={styles.metricValue}>${metrics.avgTicket.toFixed(2)}</Text>
                </View>
                <View style={styles.metricSmall}>
                  <Text style={styles.metricLabelSmall}>Tiempo Prep.</Text>
                  <Text style={styles.metricValue}>
                    {metrics.avgPrepTime} <Text style={styles.unit}>min</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Gráfica de Barras */}
            {hourlyData.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Pedidos por Hora</Text>
                <BarChart data={hourlyData} />
              </View>
            )}

            {/* Top Productos */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Productos Más Vendidos</Text>
                {topProducts.length > 0 && (
                  <TouchableOpacity onPress={() => setAllProductsVisible(true)}>
                    <Text style={styles.viewAll}>Ver todos ({topProducts.length}) →</Text>
                  </TouchableOpacity>
                )}
              </View>

              {topProducts.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="chart-line-variant" size={60} color="#CCC3D8" />
                  <Text style={styles.emptyTitle}>Sin ventas aún</Text>
                </View>
              ) : (
                topProducts.slice(0, 5).map((product, index) => (
                  <View key={product.id} style={styles.productCard}>
                    <View style={styles.rankContainer}>
                      <Text style={[styles.rank, index < 3 && styles.rankTop]}>#{index + 1}</Text>
                    </View>
                    <Image source={{ uri: product.image }} style={styles.productImg} />
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                      <Text style={styles.productStats}>
                        {product.ordersToday} pedidos • ${product.revenue.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, {
                        width: `${Math.max(15, (product.ordersToday / maxOrders) * 100)}%`
                      }]} />
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ==================== BARRA DE NAVEGACIÓN (IGUAL QUE StaffHomeScreen) ==================== */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.navItem} onPress={handleGoToHome}>
          <MaterialCommunityIcons name="home-outline" size={24} color={COLORS.onSurfaceVariant} />
          <Text style={styles.navLabel}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleGoToMenu}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={COLORS.onSurfaceVariant} />
          <Text style={styles.navLabel}>Menú</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItemActive}>
          <MaterialCommunityIcons name="chart-box" size={24} color={COLORS.primary} />
          <Text style={styles.navLabelActive}>Estadísticas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleGoToProfile}>
          <MaterialCommunityIcons name="account-outline" size={24} color={COLORS.onSurfaceVariant} />
          <Text style={styles.navLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Ver Todos los Productos */}
      <Modal
        visible={allProductsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAllProductsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Todos los Productos</Text>
              <TouchableOpacity onPress={() => setAllProductsVisible(false)}>
                <MaterialCommunityIcons name="close" size={28} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
              {topProducts.map((product, index) => (
                <View key={product.id} style={styles.productCardModal}>
                  <Text style={[styles.rankModal, index < 3 && styles.rankTop]}>#{index + 1}</Text>
                  <Image source={{ uri: product.image }} style={styles.productImgModal} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productNameModal}>{product.name}</Text>
                    <Text style={styles.productStatsModal}>
                      {product.ordersToday} pedidos • ${product.revenue.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  topBarSubtitle: { fontSize: 13, color: COLORS.onSurfaceVariant },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface, marginBottom: 20 },

  timeSelector: { flexDirection: 'row', backgroundColor: COLORS.surfaceContainerLow, borderRadius: 12, padding: 4, marginBottom: 24 },
  timeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  timeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3 },
  timeBtnText: { fontWeight: '600', color: COLORS.onSurfaceVariant },
  timeBtnTextActive: { color: COLORS.primary },

  metricsContainer: { marginBottom: 28 },
  metricBig: { backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 20, padding: 24, marginBottom: 16 },
  metricBigValue: { fontSize: 48, fontWeight: '700', color: COLORS.primary, marginVertical: 4 },
  growth: { color: COLORS.green, fontWeight: '600' },

  metricRow: { flexDirection: 'row', gap: 12 },
  metricSmall: { flex: 1, backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 16, padding: 18 },
  metricLabel: { fontSize: 14, color: COLORS.onSurfaceVariant, marginBottom: 4 },
  metricLabelSmall: { fontSize: 13, color: COLORS.onSurfaceVariant },
  metricValue: { fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  unit: { fontSize: 16, color: COLORS.onSurfaceVariant },

  chartCard: { backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 20, padding: 20, marginBottom: 24 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface, marginBottom: 12 },

  barValue: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  barLabel: { fontSize: 11, color: COLORS.onSurfaceVariant },

  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  viewAll: { color: COLORS.primary, fontWeight: '600' },

  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  rankContainer: { width: 36 },
  rank: { fontSize: 18, fontWeight: '700', color: COLORS.onSurfaceVariant },
  rankTop: { color: COLORS.primary },

  productImg: { width: 56, height: 56, borderRadius: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: COLORS.onSurface },
  productStats: { fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 2 },

  progressContainer: { width: 60, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, color: COLORS.onSurfaceVariant, fontSize: 16 },

  emptyState: { alignItems: 'center', padding: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, color: COLORS.onSurfaceVariant },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%' },
  modalHandle: { width: 40, height: 5, backgroundColor: COLORS.outlineVariant, borderRadius: 3, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700' },

  productCardModal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainer,
    gap: 16,
  },
  rankModal: { fontSize: 20, fontWeight: '700', width: 40, color: COLORS.onSurfaceVariant },
  productImgModal: { width: 64, height: 64, borderRadius: 14 },
  productNameModal: { fontSize: 16, fontWeight: '600' },
  productStatsModal: { fontSize: 14, color: COLORS.onSurfaceVariant },

  // ==================== BARRA DE NAVEGACIÓN (IGUAL QUE StaffHomeScreen) ====================
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