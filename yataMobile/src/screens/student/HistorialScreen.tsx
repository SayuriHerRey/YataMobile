// src/screens/student/HistorialScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { orderService, OrderOut } from '../../services/orderService';
import { Session } from '../../services/config';
import { notificationService } from '../../services/notificationService';
import NotificationDrawer from '../../components/NotificationDrawer';

const COLORS = {
  primary: '#630ED4',
  surface: '#F8F9FA',
  onSurface: '#191C1D',
  onSurfaceVariant: '#4A4455',
  onPrimary: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  outlineVariant: '#CCC3D8',
  error: '#BA1A1A',
  green: '#16A34A',
  amber: '#F59E0B',
};

type OrderStatus = 'completado' | 'cancelado' | 'en_proceso' | 'pendiente' | 'en_preparacion' | 'listo' | 'entregado';

interface HistoryOrder {
  id: string;
  order_number: string;
  date: string;
  total: number;
  status: OrderStatus;
  items_count: number;
  created_at: string;
}

const getStatusInfo = (status: OrderStatus): { label: string; color: string; bg: string } => {
  const statusMap: Record<OrderStatus, { label: string; color: string; bg: string }> = {
    completado: { label: 'Completado', color: COLORS.green, bg: `${COLORS.green}1A` },
    entregado: { label: 'Entregado', color: COLORS.green, bg: `${COLORS.green}1A` },
    cancelado: { label: 'Cancelado', color: COLORS.error, bg: `${COLORS.error}1A` },
    en_proceso: { label: 'En proceso', color: COLORS.primary, bg: `${COLORS.primary}1A` },
    pendiente: { label: 'Pendiente', color: COLORS.amber, bg: `${COLORS.amber}1A` },
    en_preparacion: { label: 'En preparación', color: COLORS.primary, bg: `${COLORS.primary}1A` },
    listo: { label: 'Listo', color: COLORS.green, bg: `${COLORS.green}1A` },
  };
  return statusMap[status] || { label: status, color: COLORS.onSurfaceVariant, bg: `${COLORS.onSurfaceVariant}1A` };
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `${diffDays} días atrás`;

  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

export default function HistorialScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchOrderHistory = async () => {
    try {
      const user = await Session.getUser();

      if (!user || !user.id) {
        console.error('❌ Usuario no autenticado');
        setOrders([]);
        return;
      }

      setUserId(user.id);
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);

      const history = await orderService.getStudentHistory(user.id);

      // Transformar datos para la UI
      const transformedOrders: HistoryOrder[] = history.map((order: OrderOut) => ({
        id: order.id,
        order_number: order.order_number || order.id.slice(-6).toUpperCase(),
        date: formatDate(order.created_at),
        // 🔧 CORREGIDO: usar el nombre correcto del campo
        // Prueba con: order.total, order.total_price, order.total_amount
        total: (order as any).total || (order as any).total_price || (order as any).total_amount || 0,
        status: mapOrderStatus(order.status),
        items_count: order.items?.length || 0,
        created_at: order.created_at,
      }));

      setOrders(transformedOrders);
    } catch (err) {
      console.error('❌ Error al cargar historial:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const mapOrderStatus = (status: string): OrderStatus => {
    switch (status) {
      case 'entregado':
        return 'entregado';
      case 'cancelado':
        return 'cancelado';
      case 'listo':
        return 'listo';
      case 'en_preparacion':
        return 'en_preparacion';
      case 'pendiente':
        return 'pendiente';
      case 'completado':
        return 'completado';
      default:
        return 'en_proceso';
    }
  };

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrderHistory();
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('Seguimiento', { orderId });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <SafeAreaView style={styles.container}>
        {/* TOP BAR */}
        <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8 }]}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Historial de Pedidos</Text>
          {userId ? (
            <NotificationDrawer
              userId={userId}
              unreadCount={unreadCount}
              onUnreadChange={setUnreadCount}
            />
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        >
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="receipt-outline" size={64} color={COLORS.outlineVariant} />
              <Text style={styles.emptyStateTitle}>No hay pedidos</Text>
              <Text style={styles.emptyStateText}>
                Aún no has realizado ningún pedido.{"\n"}
                ¡Visita el menú y prueba nuestros platillos!
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('Menu')}
              >
                <Text style={styles.emptyStateButtonText}>Ver menú</Text>
              </TouchableOpacity>
            </View>
          ) : (
            orders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  activeOpacity={0.7}
                  onPress={() => handleOrderPress(order.id)}
                >
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderNumber}>{order.order_number}</Text>
                      <Text style={styles.orderDate}>{order.date}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderDivider} />

                  <View style={styles.orderFooter}>
                    <View style={styles.orderMeta}>
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="package-variant" size={14} color={COLORS.onSurfaceVariant} />
                        <Text style={styles.metaText}>
                          {order.items_count} {order.items_count === 1 ? 'producto' : 'productos'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                  </View>

                  <View style={styles.detailIndicator}>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.outlineVariant} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  centerContent: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12
  },
  orderCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}1A`,
    position: 'relative',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderDivider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
    opacity: 0.3,
    marginVertical: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderMeta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  detailIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyStateButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});