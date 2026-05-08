// src/screens/student/SeguimientoScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCartStore } from '../../store/cartStore';
import { orderService, OrderOut } from '../../services/orderService';
import { Session } from '../../services/config';

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

type OrderStatus = 'recibido' | 'en_preparacion' | 'listo' | 'entregado';

const getStepStatus = (current: OrderStatus, stepId: string): 'pending' | 'active' | 'completed' => {
  const order: Record<string, number> = { recibido: 1, en_preparacion: 2, listo: 3, entregado: 4 };
  const c = order[current] ?? 0;
  const s = order[stepId] ?? 0;
  if (s < c) return 'completed';
  if (s === c) return 'active';
  return 'pending';
};

const STEPS = [
  { id: 'recibido', label: 'Recibido', description: 'Estamos procesando tu orden' },
  { id: 'en_preparacion', label: 'En preparación', description: 'El chef está cocinando tu comida' },
  { id: 'listo', label: 'Listo', description: '¡Tu orden está lista para recoger!' },
  { id: 'entregado', label: 'Entregado', description: 'Gracias por tu preferencia' },
];

const getInstruction = (status: OrderStatus) => {
  const map: Record<string, { title: string; text: string }> = {
    recibido: { title: 'Pedido recibido', text: 'Hemos recibido tu pedido y pronto comenzaremos a prepararlo.' },
    en_preparacion: { title: 'En preparación', text: 'Tu comida está siendo preparada por nuestro equipo.' },
    listo: { title: '¡Tu orden está lista!', text: 'Presenta tu número de orden al personal para recogerlo.' },
    entregado: { title: 'Pedido entregado', text: 'Esperamos que hayas disfrutado tu comida. ¡Vuelve pronto!' },
  };
  return map[status] ?? { title: 'Seguimiento', text: 'Procesando...' };
};

const getTotal = (o: OrderOut): number =>
  (o as any).total || (o as any).total_price || (o as any).total_amount || 0;

export default function SeguimientoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cartCount = useCartStore((s) => s.totalItems());

  const [order, setOrder] = useState<OrderOut | null>(null);
  const [user, setUser] = useState<any>(null); // Para avatar real
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [deliveredModal, setDeliveredModal] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deliveredShownRef = useRef(false);

  // Animaciones para el modal de entrega
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState(5);

  const orderId: string | undefined = route.params?.orderId;

  // Cargar usuario real para avatar
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await Session.getUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const avatarUrl = user?.avatar ||
    `https://ui-avatars.com/api/?background=630ED4&color=fff&name=${encodeURIComponent(user?.name || 'Usuario')}`;

  const showDeliveredModal = () => {
    setDeliveredModal(true);
    setCountdown(5);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }).start();
    }, 200);

    let count = 5;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        goToHistory();
      }
    }, 1000);
  };

  const goToHistory = () => {
    setDeliveredModal(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    navigation.reset({
      index: 0,
      routes: [{ name: 'StudentTabs', params: { screen: 'Pedidos' } }],
    });
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const fetchStatus = async () => {
    if (!orderId || orderId.startsWith('#') || orderId.length < 8) {
      console.error('❌ orderId inválido recibido:', orderId);
      setFetchError(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setFetchError(false);
      const data = await orderService.getOrderStatus(orderId);
      setOrder(data);

      if (data.status === 'entregado' && !deliveredShownRef.current) {
        deliveredShownRef.current = true;
        stopPolling();
        showDeliveredModal();
      }
    } catch (err) {
      console.error('❌ Error al obtener estado del pedido:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setFetchError(true);
      return;
    }

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 5000);

    return () => {
      stopPolling();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [orderId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <MaterialCommunityIcons name="loading" size={40} color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando estado de tu pedido...</Text>
      </SafeAreaView>
    );
  }

  if (fetchError || !order) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <MaterialCommunityIcons name="package-variant-closed" size={64} color={COLORS.outlineVariant} />
        <Text style={styles.errorTitle}>Pedido no encontrado</Text>
        <Text style={styles.errorText}>
          No pudimos obtener los detalles de tu pedido.{'\n'}
          Verifica tu conexión e intenta de nuevo.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={handleRefresh}>
          <Text style={styles.btnText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: COLORS.surfaceContainerHigh, marginTop: 8 }]}
          onPress={() => navigation.navigate('StudentTabs')}
        >
          <Text style={[styles.btnText, { color: COLORS.onSurface }]}>Volver al inicio</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderDeliveredModal = () => (
    <Modal visible={deliveredModal} transparent animationType="none" onRequestClose={goToHistory}>
      <Animated.View style={[styles.deliveredOverlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.deliveredCard, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.View
            style={[
              styles.deliveredCheckCircle,
              { transform: [{ scale: checkAnim }], opacity: checkAnim },
            ]}
          >
            <MaterialCommunityIcons name="check-bold" size={52} color="#FFFFFF" />
          </Animated.View>

          <Text style={styles.deliveredTitle}>¡Pedido entregado!</Text>
          <Text style={styles.deliveredSubtitle}>{order?.order_number || ''}</Text>
          <Text style={styles.deliveredMessage}>
            Esperamos que disfrutes tu comida.{'\n'}¡Gracias por tu preferencia! 🎉
          </Text>

          <View style={styles.deliveredCountdownRow}>
            <View style={styles.deliveredCountdownCircle}>
              <Text style={styles.deliveredCountdownNum}>{countdown}</Text>
            </View>
            <Text style={styles.deliveredCountdownText}>Redirigiendo a tus pedidos...</Text>
          </View>

          <TouchableOpacity style={styles.deliveredBtn} onPress={goToHistory} activeOpacity={0.85}>
            <LinearGradient
              colors={['#16A34A', '#15803D']}
              style={styles.deliveredBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#fff" />
              <Text style={styles.deliveredBtnText}>Ver mis pedidos</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  const total = getTotal(order!);
  const { title, text } = getInstruction((order?.status ?? 'recibido') as OrderStatus);
  const isReady = order?.status === 'listo';

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <SafeAreaView style={styles.container}>
        {renderDeliveredModal()}

        <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8 }]}>
          <View style={styles.row}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <Text style={styles.cafeName}>YaTá</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.onSurface} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
        >
          <View style={{ marginBottom: 32 }}>
            <Text style={styles.statusLabel}>Estatus del Pedido</Text>
            <Text style={styles.statusTitle}>
              {order.status === 'listo' ? '¡Tu pedido está listo!' : 'Seguimiento de tu pedido'}
            </Text>
          </View>

          {/* Número de Orden */}
          <View style={styles.orderNumCard}>
            <Text style={styles.orderNumLabel}>Número de Orden</Text>
            <Text style={styles.orderNumValue} numberOfLines={1} adjustsFontSizeToFit>
              {order.order_number || order.id.slice(-8).toUpperCase()}
            </Text>
          </View>

          {/* Instrucción */}
          <View style={[styles.instructionCard, isReady && { backgroundColor: `${COLORS.green}0D` }]}>
            <View style={[styles.instructionIcon, isReady && { backgroundColor: COLORS.green }]}>
              <MaterialCommunityIcons
                name={isReady ? 'storefront' : 'clock-outline'}
                size={20}
                color={isReady ? COLORS.onPrimary : COLORS.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.instructionTitle}>{title}</Text>
              <Text style={styles.instructionText}>{text}</Text>
            </View>
          </View>

          {/* Timeline */}
          <View style={{ marginBottom: 32 }}>
            {STEPS.map((step, idx) => {
              const st = getStepStatus(order.status as OrderStatus, step.id);
              const done = st === 'completed';
              const active = st === 'active';
              return (
                <React.Fragment key={step.id}>
                  <View style={styles.timelineStep}>
                    <View
                      style={[
                        styles.timelineIcon,
                        done && { backgroundColor: COLORS.green },
                        active && { backgroundColor: COLORS.primary },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={done ? 'check' : active ? 'progress-clock' : 'circle-outline'}
                        size={18}
                        color={done || active ? COLORS.onPrimary : COLORS.outlineVariant}
                      />
                    </View>
                    <View style={{ flex: 1, paddingTop: 4 }}>
                      <Text
                        style={[
                          styles.stepLabel,
                          (done || active) && { color: COLORS.onSurface, fontWeight: '700' },
                        ]}
                      >
                        {step.label}
                      </Text>
                      <Text style={styles.stepDesc}>{step.description}</Text>
                    </View>
                  </View>
                  {idx < STEPS.length - 1 && <View style={styles.connector} />}
                </React.Fragment>
              );
            })}
          </View>

          {/* Resumen del Pedido */}
          {order.items?.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumen del pedido</Text>
              {order.items.map((item, idx) => (
                <View key={idx} style={styles.summaryRow}>
                  <Text style={styles.summaryItem}>
                    {item.quantity}x {item.name}
                  </Text>
                  <Text style={styles.summaryPrice}>
                    ${(item.unit_price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={[styles.summaryRow, { marginTop: 12, paddingTop: 8, borderTopWidth: 0 }]}>
                <Text style={[styles.summaryItem, { fontWeight: '700', fontSize: 16 }]}>Total</Text>
                <Text
                  style={[
                    styles.summaryPrice,
                    { fontWeight: '700', fontSize: 16, color: COLORS.primary },
                  ]}
                >
                  ${total.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          <View style={{ marginTop: 8, marginBottom: 24 }}>
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => navigation.navigate('StudentTabs')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryContainer]}
                style={styles.homeBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.homeBtnText}>Volver al inicio</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          {[
            { icon: 'home-outline', label: 'Inicio', screen: 'Home' },
            { icon: 'silverware-fork-knife', label: 'Menú', screen: 'Menu' },
            { icon: 'cart-outline', label: 'Carrito', screen: 'Carrito', badge: cartCount },
            { icon: 'history', label: 'Pedidos', screen: 'Pedidos' },
            { icon: 'account-outline', label: 'Perfil', screen: 'Perfil' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              onPress={() => navigation.navigate('StudentTabs', { screen: item.screen })}
            >
              <View>
                <MaterialCommunityIcons name={item.icon as any} size={24} color={COLORS.onSurface} />
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.navLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  center: { justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 24 },
  loadingText: { fontSize: 16, color: COLORS.onSurfaceVariant, marginTop: 8 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: COLORS.error, marginTop: 16 },
  errorText: { fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  btnText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '600' },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceContainerHigh },
  cafeName: { fontSize: 20, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },

  statusLabel: { fontSize: 12, fontWeight: '700', color: COLORS.secondary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  statusTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -1 },

  orderNumCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  orderNumLabel: { fontSize: 14, fontWeight: '500', color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  orderNumValue: { fontSize: 40, fontWeight: '700', color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: -2 },

  instructionCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 32,
  },
  instructionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  instructionText: { fontSize: 14, color: COLORS.onSurfaceVariant, lineHeight: 20 },

  timelineStep: { flexDirection: 'row', gap: 20, paddingBottom: 28 },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
    zIndex: 1,
  },
  stepLabel: { fontSize: 16, fontWeight: '500', color: COLORS.onSurfaceVariant, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: COLORS.onSurfaceVariant },
  connector: {
    position: 'absolute',
    left: 18,
    width: 2,
    height: 28,
    backgroundColor: `${COLORS.outlineVariant}4D`,
    marginTop: 44,
    zIndex: 0,
  },

  summaryCard: { backgroundColor: COLORS.surfaceContainerLow, borderRadius: 16, padding: 20, marginBottom: 24 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: COLORS.onSurfaceVariant, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  summaryItem: { fontSize: 14, color: COLORS.onSurface },
  summaryPrice: { fontSize: 14, color: COLORS.onSurface, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  homeBtn: { borderRadius: 16, overflow: 'hidden' },
  homeBtnGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  homeBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.onPrimary },

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  navItem: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, opacity: 0.6 },
  navLabel: { fontSize: 12, fontWeight: '500', color: COLORS.onSurface, marginTop: 4 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: COLORS.onPrimary, fontSize: 9, fontWeight: '700' },

  // Modal de entrega
  deliveredOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  deliveredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  deliveredCheckCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  deliveredTitle: { fontSize: 28, fontWeight: '800', color: '#191C1D', marginBottom: 6, letterSpacing: -0.5 },
  deliveredSubtitle: { fontSize: 16, fontWeight: '700', color: '#630ED4', marginBottom: 16, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  deliveredMessage: { fontSize: 15, color: '#4A4455', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  deliveredCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F5',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    width: '100%',
  },
  deliveredCountdownCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#630ED4', alignItems: 'center', justifyContent: 'center' },
  deliveredCountdownNum: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  deliveredCountdownText: { fontSize: 13, fontWeight: '600', color: '#4A4455', flex: 1 },
  deliveredBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  deliveredBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  deliveredBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});