// src/screens/student/HomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentTabParamList, StudentStackParamList } from '../../types';
import { orderService, OrderOut } from '../../services/orderService';
import { Session, AppUser } from '../../services/config';
import { notificationService } from '../../services/notificationService';
import NotificationDrawer from '../../components/NotificationDrawer';

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
  tertiary: '#7D3D00',
  green: '#16A34A',
  amber: '#F59E0B',
};

type OrderStatus = 'recibido' | 'en_preparacion' | 'listo' | 'entregado';

interface ActiveOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  progress: number;
  message: string;
}

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<StudentTabParamList, 'Home'>,
  NativeStackNavigationProp<StudentStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Cargar datos del usuario real
  useEffect(() => {
    const loadUser = async () => {
      const userData = await Session.getUser();
      console.log('👤 Usuario cargado en HomeScreen:', userData);
      setUser(userData);
      if (userData) {
        const count = await notificationService.getUnreadCount(userData.id);
        setUnreadCount(count);
      }
    };
    loadUser();
  }, []);

  const handleUnreadChange = (count: number) => setUnreadCount(count);

  // Función para obtener la orden activa
  const fetchActiveOrder = async () => {
    try {
      if (!user) return;

      // Usar el endpoint de historial del estudiante, no el endpoint de cocina
      const orders = await orderService.getStudentHistory(user.id);
      console.log('📦 Órdenes del estudiante:', orders);

      // Filtrar órdenes que no estén entregadas
      const userOrders = orders.filter(o => o.status !== 'entregado');

      if (userOrders.length > 0) {
        const latestOrder = userOrders[0];
        const progress = getProgressByStatus(latestOrder.status);
        const message = getMessageByStatus(latestOrder.status);
        setActiveOrder({
          id: latestOrder.id,
          order_number: latestOrder.order_number,
          status: latestOrder.status,
          progress,
          message,
        });
      } else {
        setActiveOrder(null);
      }
    } catch (error) {
      console.error('Error fetching active order:', error);
      setActiveOrder(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refrescar cuando el usuario cambia o la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchActiveOrder();
      }
    }, [user])
  );

  // Refrescar cuando el usuario se carga
  useEffect(() => {
    if (user) {
      fetchActiveOrder();
    }
  }, [user]);

  const getProgressByStatus = (status: OrderStatus): number => {
    switch (status) {
      case 'recibido': return 25;
      case 'en_preparacion': return 60;
      case 'listo': return 100;
      default: return 0;
    }
  };

  const getMessageByStatus = (status: OrderStatus): string => {
    switch (status) {
      case 'recibido': return '✅ Pedido recibido. Pronto comenzaremos a prepararlo.';
      case 'en_preparacion': return '👨‍🍳 Tu pedido está siendo preparado con esmero.';
      case 'listo': return '¡Tu pedido está listo para recoger! Pasa por caja.';
      default: return '';
    }
  };

  const getEtaByStatus = (status: OrderStatus): number => {
    switch (status) {
      case 'recibido': return 15;
      case 'en_preparacion': return 8;
      case 'listo': return 0;
      default: return 0;
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActiveOrder();
  };

  const handleGoToMenu = () => {
    navigation.navigate('Menu');
  };

  const handleTrackOrder = () => {
    if (activeOrder) {
      navigation.navigate('Seguimiento', { orderId: activeOrder.id });
    }
  };

  const renderActiveOrderCard = () => {
    if (!activeOrder) return null;

    const etaMinutes = getEtaByStatus(activeOrder.status);
    const isReady = activeOrder.status === 'listo';

    return (
      <TouchableOpacity
        style={[styles.orderCard, isReady && styles.orderCardReady]}
        onPress={handleTrackOrder}
        activeOpacity={0.9}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderLabel}>Pedido en curso</Text>
            <Text style={styles.orderNumber}>{activeOrder.order_number}</Text>
          </View>
          {!isReady && (
            <View style={styles.etaBadge}>
              <Text style={styles.etaText}>~{etaMinutes} min</Text>
            </View>
          )}
          {isReady && (
            <View style={[styles.etaBadge, styles.readyBadge]}>
              <Text style={styles.readyBadgeText}>¡LISTO!</Text>
            </View>
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressLabel, activeOrder.progress >= 25 && styles.progressLabelActive]}>
              Recibido
            </Text>
            <Text style={[styles.progressLabel, activeOrder.progress >= 60 && styles.progressLabelActive]}>
              Preparación
            </Text>
            <Text style={[styles.progressLabel, activeOrder.progress >= 100 && styles.progressLabelActive]}>
              Listo
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${activeOrder.progress}%` }]} />
          </View>

          <Text style={styles.orderMessage}>{activeOrder.message}</Text>
        </View>

        <View style={styles.trackButton}>
          <Text style={styles.trackButtonText}>Ver seguimiento</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyOrderState = () => (
    <TouchableOpacity
      style={styles.emptyOrderCard}
      onPress={handleGoToMenu}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons name="silverware-fork-knife" size={48} color={COLORS.primary} />
      <Text style={styles.emptyOrderTitle}>¿Tienes hambre?</Text>
      <Text style={styles.emptyOrderSubtitle}>Haz tu primer pedido del día</Text>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryContainer]}
        style={styles.emptyOrderButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.emptyOrderButtonText}>Ver menú</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.onPrimary} />
      </LinearGradient>
    </TouchableOpacity>
  );

  const displayName = user?.name?.split(' ')[0] || 'Estudiante';
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?background=630ED4&color=fff&name=${displayName}`;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <SafeAreaView style={styles.container}>
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
          <View style={styles.userInfo}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View style={styles.greeting}>
              <Text style={styles.greetingLabel}>Hola, {displayName}</Text>
              <Text style={styles.cafeteriaName}>YaTá</Text>
            </View>
          </View>
          {user && (
            <NotificationDrawer
              userId={user.id}
              unreadCount={unreadCount}
              onUnreadChange={handleUnreadChange}
            />
          )}
        </View>

        {/* Main Content - SIN BOTTOM NAV */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollPadding}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        >
          {activeOrder ? renderActiveOrderCard() : renderEmptyOrderState()}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accesos rápidos</Text>
            <View style={styles.bentoGrid}>
              <TouchableOpacity style={styles.bentoCardLarge} onPress={handleGoToMenu} activeOpacity={0.9}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format'
                  }}
                  style={styles.bentoImage}
                  resizeMode="cover"
                />
                <View style={styles.bentoOverlay} />
                <View style={styles.bentoContent}>
                  <Text style={styles.bentoTitle}>Menú del día</Text>
                  <Text style={styles.bentoSubtitle}>Descubre las opciones de hoy</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceContainer,
  },
  greeting: {
    gap: 2,
  },
  greetingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
  },
  cafeteriaName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  scrollContent: {
    flex: 1,
  },
  scrollPadding: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 30,
  },
  orderCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 32,
  },
  orderCardReady: {
    borderWidth: 2,
    borderColor: COLORS.green,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  orderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: -1,
  },
  etaBadge: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  readyBadge: {
    backgroundColor: COLORS.green,
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onPrimary,
  },
  progressContainer: {
    gap: 12,
    marginBottom: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressLabelActive: {
    color: COLORS.primary,
    opacity: 1,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  orderMessage: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainer,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyOrderCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 32,
  },
  emptyOrderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyOrderSubtitle: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyOrderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: 16,
  },
  bentoGrid: {
    gap: 16,
  },
  bentoCardLarge: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  bentoImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    // Eliminado overflow ya que no es válido para Image
  },
  bentoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(25, 28, 29, 0.45)',
  },
  bentoContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  bentoTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.onPrimary,
    marginBottom: 4,
  },
  bentoSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: `${COLORS.onPrimary}CC`,
  },
  bottomSpacer: {
    height: 20, // Corregido: eliminado el operador | y la coma extra
  },
});