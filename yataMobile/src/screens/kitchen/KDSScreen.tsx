// src/screens/kitchen/KDSScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  BackHandler,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { orderService, OrderOut, OrderItemOut, OrderStatus } from '../../services/orderService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#630ED4',
  primaryContainer: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDim: 'rgba(99,14,212,0.15)',
  surface: '#F8F9FA',
  onSurface: '#191C1D',
  onSurfaceVariant: '#4A4455',
  onPrimary: '#FFFFFF',
  surfaceContainerLow: '#F3F4F5',
  surfaceContainerLowest: '#FFFFFF',
  outlineVariant: '#CCC3D8',
  error: '#BA1A1A',
  errorDim: 'rgba(186,26,26,0.12)',
  green: '#16A34A',
  greenLight: '#22C55E',
  greenDim: 'rgba(22,163,74,0.12)',
  amber: '#F59E0B',
  amberLight: '#FBBF24',
  amberDim: 'rgba(245,158,11,0.12)',
  red: '#EF4444',
  border: '#E5E7EB',
};

interface UIOrder extends Omit<OrderOut, 'status' | 'items'> {
  status: OrderStatus;
  items: UIOrderItem[];
  startedAt?: Date;
}

interface UIOrderItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  customization?: string;
  special_instructions?: string;
  done: boolean;
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

const getElapsedMin = (date: Date) =>
  Math.floor((Date.now() - new Date(date).getTime()) / 60000);

const getUrgencyColor = (elapsedMin: number) => {
  if (elapsedMin < 5) return COLORS.green;
  if (elapsedMin < 10) return COLORS.amber;
  return COLORS.red;
};

export default function KDSScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<UIOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState<UIOrder | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modalVisible) {
        setModalVisible(false);
        return true;
      }
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [modalVisible, navigation]);

  const fetchActiveOrders = async () => {
    try {
      const data = await orderService.getActiveOrders();
      const transformedOrders: UIOrder[] = data.map(order => ({
        ...order,
        status: order.status,
        startedAt: order.started_at ? new Date(order.started_at) : undefined,
        items: (order.items || []).map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          customization: item.customization_text,
          special_instructions: order.special_instructions || undefined,
          done: item.done || false,
        })),
      }));
      setOrders(transformedOrders);
      // Sync selectedOrder con los datos frescos si el modal está abierto
      setSelectedOrder(prev => {
        if (!prev) return null;
        const updated = transformedOrders.find(o => o.id === prev.id);
        return updated ?? null;
      });
    } catch (err) {
      console.error('Error loading orders:', err);
      Alert.alert('Error', 'No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
    intervalRef.current = setInterval(fetchActiveOrders, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActiveOrders();
  };

  const handleStartPrep = async (orderId: string) => {
    try {
      await orderService.startPreparation(orderId);
      await fetchActiveOrders();
    } catch (err) {
      Alert.alert('Error', 'No se pudo iniciar la preparación');
    }
  };

  const handleToggleItem = async (orderId: string, itemId: string) => {
    try {
      let allItemsReady = false;
      let currentStatus: string = '';

      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        const updatedItems = o.items.map(i =>
          i.id === itemId ? { ...i, done: !i.done } : i
        );
        allItemsReady = updatedItems.every(i => i.done);
        currentStatus = o.status;
        return { ...o, items: updatedItems };
      }));

      await orderService.markItemDone(orderId, itemId);

      if (allItemsReady && currentStatus === 'en_preparacion') {
        Alert.alert(
          '✅ Todos los items están listos',
          '¿Deseas marcar este pedido como listo?',
          [
            { text: 'No', style: 'cancel' },
            { text: 'Sí', onPress: () => handleMarkReady(orderId) }
          ]
        );
      }
      await fetchActiveOrders();
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
      await fetchActiveOrders();
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      await orderService.markOrderReady(orderId);
      await fetchActiveOrders();
    } catch (err) {
      Alert.alert('Error', 'No se pudo marcar como listo');
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    Alert.alert(
      'Entregar pedido',
      '¿Confirmas que el pedido ha sido entregado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Entregar',
          onPress: async () => {
            try {
              await orderService.markOrderDelivered(orderId);
              Alert.alert('Éxito', 'Pedido entregado');
              await fetchActiveOrders();
            } catch (err) {
              Alert.alert('Error', 'No se pudo marcar como entregado');
            }
          }
        },
      ]
    );
  };

  const handleViewOrderDetail = (order: UIOrder) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const receivedOrders = orders.filter(o => o.status === 'recibido');
  const prepOrders = orders.filter(o => o.status === 'en_preparacion');
  const readyOrders = orders.filter(o => o.status === 'listo');

  const renderOrderItem = (orderId: string, item: UIOrderItem, showCheckbox: boolean = false) => {
    const itemContent = (
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemQuantity, !showCheckbox && item.done && styles.itemDoneText]}>
            {item.quantity}×
          </Text>
          <Text style={[styles.itemName, !showCheckbox && item.done && styles.itemDoneText]}>
            {item.name}
          </Text>
        </View>
        {!!item.customization && (
          <View style={styles.itemCustomization}>
            <MaterialCommunityIcons name="pencil" size={12} color={COLORS.primary} />
            <Text style={styles.itemCustomizationText}>{item.customization}</Text>
          </View>
        )}
        {!!item.special_instructions && (
          <View style={styles.itemInstruction}>
            <MaterialCommunityIcons name="note-text" size={12} color={COLORS.amber} />
            <Text style={styles.itemInstructionText}>💡 {item.special_instructions}</Text>
          </View>
        )}
      </View>
    );

    if (showCheckbox) {
      return (
        <TouchableOpacity key={item.id} style={styles.itemCard} onPress={() => handleToggleItem(orderId, item.id)}>
          <View style={styles.itemCheckbox}>
            <MaterialCommunityIcons
              name={item.done ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
              size={22}
              color={item.done ? COLORS.green : COLORS.onSurfaceVariant}
            />
          </View>
          {itemContent}
        </TouchableOpacity>
      );
    }

    return (
      <View key={item.id} style={[styles.itemCard, styles.itemCardReadOnly]}>
        <View style={styles.itemCheckboxPlaceholder} />
        {itemContent}
      </View>
    );
  };

  const renderOrderDetailModal = () => {
    if (!selectedOrder) return null;
    const doneCount = selectedOrder.items.filter(i => i.done).length;
    const totalCount = selectedOrder.items.length;
    const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

    return (
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle del Pedido</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalOrderNumber}>
                <MaterialCommunityIcons name="receipt" size={20} color={COLORS.primary} />
                <Text style={styles.modalOrderNumberText}>
                  {selectedOrder.order_number || selectedOrder.id.slice(-6).toUpperCase()}
                </Text>
              </View>
              <View style={styles.modalProgressContainer}>
                <View style={styles.modalProgressBar}>
                  <View style={[styles.modalProgressFill, { width: `${progressPct}%` }]} />
                </View>
                <Text style={styles.modalProgressText}>{doneCount}/{totalCount} preparados</Text>
              </View>
              <View style={styles.modalInfoRow}>
                <View style={styles.modalInfoItem}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.onSurfaceVariant} />
                  <Text style={styles.modalInfoText}>Hora: {formatTime(new Date(selectedOrder.created_at))}</Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <MaterialCommunityIcons name="cash" size={16} color={COLORS.onSurfaceVariant} />
                  <Text style={styles.modalInfoText}>
                    Pago: {selectedOrder.payment_method === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}
                  </Text>
                </View>
              </View>
              {selectedOrder.special_instructions && (
                <View style={styles.modalSpecialInstructions}>
                  <Text style={styles.modalSectionTitle}>Instrucciones generales</Text>
                  <Text style={styles.modalSpecialText}>{selectedOrder.special_instructions}</Text>
                </View>
              )}
              <Text style={styles.modalSectionTitle}>Productos</Text>
              {selectedOrder.items.map((item) => (
                <TouchableOpacity key={item.id} style={styles.modalItemCard} onPress={() => {
                  handleToggleItem(selectedOrder.id, item.id);
                  setSelectedOrder(prev => prev ? {
                    ...prev,
                    items: prev.items.map(i => i.id === item.id ? { ...i, done: !i.done } : i)
                  } : null);
                }}>
                  <View style={styles.modalItemHeader}>
                    <MaterialCommunityIcons
                      name={item.done ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                      size={22}
                      color={item.done ? COLORS.green : COLORS.onSurfaceVariant}
                    />
                    <View style={styles.modalItemContent}>
                      <View style={styles.modalItemTitleRow}>
                        <Text style={styles.modalItemQuantity}>{item.quantity}×</Text>
                        <Text style={[styles.modalItemName, item.done && styles.modalItemDone]}>{item.name}</Text>
                      </View>
                      {item.customization && <Text style={styles.modalItemCustomizationText}>✏️ {item.customization}</Text>}
                      {item.special_instructions && <Text style={styles.modalItemInstructionText}>📝 {item.special_instructions}</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              {selectedOrder.status === 'recibido' && (
                <TouchableOpacity style={styles.modalStartButton} onPress={() => {
                  handleStartPrep(selectedOrder.id);
                  setModalVisible(false);
                }}>
                  <Text style={styles.modalStartButtonText}>Iniciar preparación</Text>
                </TouchableOpacity>
              )}
              {selectedOrder.status === 'en_preparacion' && (
                <TouchableOpacity style={[styles.modalReadyButton, doneCount === totalCount && styles.modalReadyButtonFull]} onPress={() => {
                  handleMarkReady(selectedOrder.id);
                  setModalVisible(false);
                }}>
                  <Text style={styles.modalReadyButtonText}>Marcar como listo</Text>
                </TouchableOpacity>
              )}
              {selectedOrder.status === 'listo' && (
                <TouchableOpacity style={styles.modalDeliverButton} onPress={() => {
                  handleDeliverOrder(selectedOrder.id);
                  setModalVisible(false);
                }}>
                  <Text style={styles.modalDeliverButtonText}>Entregar pedido</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderOrderCard = (order: UIOrder) => {
    const elapsed = getElapsedMin(new Date(order.created_at));
    const prepElapsed = order.startedAt ? getElapsedMin(order.startedAt) : 0;
    const isReceived = order.status === 'recibido';
    const isPrep = order.status === 'en_preparacion';
    const isReady = order.status === 'listo';
    const isUrgent = elapsed >= 8 && !isReady;
    const urgencyColor = getUrgencyColor(elapsed);
    const doneCount = order.items.filter(i => i.done).length;
    const totalCount = order.items.length;
    const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

    return (
      <Animated.View key={order.id} style={[styles.card, isReceived && styles.cardReceived, isPrep && styles.cardPrep, isReady && styles.cardReady, isUrgent && { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity style={styles.cardHeaderLeft} onPress={() => handleViewOrderDetail(order)}>
            <Text style={styles.orderNumber}>{order.order_number || order.id.slice(-6).toUpperCase()}</Text>
            <View style={[styles.paymentBadge, order.payment_method === 'tarjeta' ? styles.paymentCard : styles.paymentCash]}>
              <Text style={styles.paymentText}>{order.payment_method === 'tarjeta' ? '💳' : '💵'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailButton} onPress={() => handleViewOrderDetail(order)}>
            <MaterialCommunityIcons name="eye" size={20} color={COLORS.primary} />
            <Text style={styles.detailButtonText}>Detalle</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.timerRow}>
          <View style={styles.timerItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={urgencyColor} />
            <Text style={[styles.timerText, { color: urgencyColor }]}>{elapsed < 1 ? 'Ahora' : `${elapsed} min`}</Text>
          </View>
          {isPrep && order.startedAt && (
            <View style={styles.timerItem}>
              <MaterialCommunityIcons name="chef-hat" size={14} color={COLORS.primary} />
              <Text style={[styles.timerText, { color: COLORS.primary }]}>Prep: {prepElapsed} min</Text>
            </View>
          )}
        </View>
        {isPrep && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progressPct}%` }]} /></View>
            <Text style={styles.progressText}>{doneCount}/{totalCount}</Text>
          </View>
        )}
        <View style={styles.itemsList}>
          {order.items.slice(0, 3).map(item => renderOrderItem(order.id, item, isPrep))}
          {order.items.length > 3 && <Text style={styles.moreItemsText}>+{order.items.length - 3} más</Text>}
        </View>
        {isReceived && (
          <TouchableOpacity style={styles.btnReceived} onPress={() => handleStartPrep(order.id)}>
            <MaterialCommunityIcons name="play-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.btnReceivedText}>Iniciar preparación</Text>
          </TouchableOpacity>
        )}
        {isPrep && (
          <TouchableOpacity style={[styles.btnReady, doneCount === totalCount && styles.btnReadyFull]} onPress={() => handleMarkReady(order.id)}>
            <MaterialCommunityIcons name="check-all" size={20} color={COLORS.onPrimary} />
            <Text style={styles.btnReadyText}>Marcar como listo</Text>
          </TouchableOpacity>
        )}
        {isReady && (
          <TouchableOpacity style={styles.btnDeliver} onPress={() => handleDeliverOrder(order.id)}>
            <MaterialCommunityIcons name="bell-ring-outline" size={20} color={COLORS.green} />
            <Text style={styles.btnDeliverText}>Entregar pedido</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  const renderColumn = (title: string, ordersList: UIOrder[], accent: string, icon: keyof typeof MaterialCommunityIcons.glyphMap, bgColor: string) => (
    <View style={[styles.column, { backgroundColor: bgColor }]}>
      <View style={[styles.columnHeader, { borderBottomColor: `${accent}30` }]}>
        <View style={styles.columnTitleContainer}>
          <View style={[styles.columnDot, { backgroundColor: accent }]} />
          <Text style={styles.columnTitle}>{title}</Text>
        </View>
        <View style={[styles.columnCount, { backgroundColor: `${accent}15` }]}>
          <Text style={[styles.columnCountText, { color: accent }]}>{ordersList.length}</Text>
        </View>
      </View>
      <ScrollView style={styles.columnScroll} contentContainerStyle={styles.columnScrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}>
        {ordersList.length === 0 ? (
          <View style={styles.emptyColumn}>
            <MaterialCommunityIcons name={icon} size={48} color={COLORS.outlineVariant} />
            <Text style={styles.emptyColumnText}>Sin órdenes</Text>
          </View>
        ) : (
          ordersList.map(renderOrderCard)
        )}
      </ScrollView>
    </View>
  );

  const urgentCount = receivedOrders.filter(o => getElapsedMin(new Date(o.created_at)) >= 8).length;

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <MaterialCommunityIcons name="loading" size={40} color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando órdenes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <SafeAreaView style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topBarLeft}>
            <MaterialCommunityIcons name="chef-hat" size={28} color={COLORS.primary} />
            <Text style={styles.topBarTitle}>KDS - Cocina</Text>
            <View style={styles.clockBadge}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.onSurfaceVariant} />
              <Text style={styles.clockText}>{formatTime(currentTime)}</Text>
            </View>
            {urgentCount > 0 && (
              <View style={styles.urgentBadge}>
                <MaterialCommunityIcons name="lightning-bolt" size={12} color={COLORS.amber} />
                <Text style={styles.urgentText}>{urgentCount} urgente{urgentCount > 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
          <View style={styles.topBarRight}>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>En línea</Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: COLORS.amber }]}>{receivedOrders.length}</Text>
                <Text style={styles.statLabel}>Recibidos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: COLORS.primary }]}>{prepOrders.length}</Text>
                <Text style={styles.statLabel}>Prep.</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: COLORS.green }]}>{readyOrders.length}</Text>
                <Text style={styles.statLabel}>Listos</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.kanban}>
          {renderColumn('Recibidos', receivedOrders, COLORS.amber, 'clock-outline', COLORS.surface)}
          {renderColumn('En preparación', prepOrders, COLORS.primary, 'chef-hat', COLORS.surfaceContainerLow)}
          {renderColumn('Listos', readyOrders, COLORS.green, 'check-circle-outline', COLORS.surface)}
        </View>
        {renderOrderDetailModal()}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  centerContent: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: COLORS.onSurfaceVariant, marginTop: 8 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: COLORS.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -0.5 },
  clockBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceContainerLow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  clockText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.amberDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  urgentText: { fontSize: 12, fontWeight: '700', color: COLORS.amber },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.greenDim, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  onlineText: { fontSize: 12, fontWeight: '700', color: COLORS.green },
  statsContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceContainerLow, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, gap: 12 },
  statItem: { alignItems: 'center', gap: 2 },
  statNumber: { fontSize: 18, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  statLabel: { fontSize: 9, fontWeight: '600', color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  kanban: { flex: 1, flexDirection: 'row', gap: 1, backgroundColor: COLORS.border },
  column: { flex: 1 },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 2 },
  columnTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  columnDot: { width: 10, height: 10, borderRadius: 5 },
  columnTitle: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface },
  columnCount: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  columnCountText: { fontSize: 13, fontWeight: '800' },
  columnScroll: { flex: 1 },
  columnScrollContent: { padding: 12, gap: 12 },
  emptyColumn: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyColumnText: { fontSize: 14, color: COLORS.onSurfaceVariant, fontWeight: '500' },
  card: { backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderLeftWidth: 4 },
  cardReceived: { borderLeftColor: COLORS.amber },
  cardPrep: { borderLeftColor: COLORS.primary },
  cardReady: { borderLeftColor: COLORS.green, opacity: 0.85 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { flex: 1, gap: 6 },
  orderNumber: { fontSize: 20, fontWeight: '800', color: COLORS.onSurface, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  paymentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  paymentCard: { backgroundColor: COLORS.primaryDim },
  paymentCash: { backgroundColor: COLORS.greenDim },
  paymentText: { fontSize: 11, fontWeight: '600', color: COLORS.onSurfaceVariant },
  detailButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryDim, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  detailButtonText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  timerItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timerText: { fontSize: 12, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, height: 6, backgroundColor: COLORS.surfaceContainerLow, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, width: 35, textAlign: 'right' },
  itemsList: { gap: 8, maxHeight: 180 },
  itemCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: COLORS.surfaceContainerLow, borderRadius: 10, padding: 10 },
  itemCardReadOnly: { opacity: 0.85 },
  itemCheckbox: { paddingTop: 2 },
  itemCheckboxPlaceholder: { width: 22, height: 22, paddingTop: 2 },
  itemContent: { flex: 1, gap: 4 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  itemQuantity: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.onSurface, flex: 1 },
  itemDoneText: { textDecorationLine: 'line-through', opacity: 0.6 },
  itemCustomization: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemCustomizationText: { fontSize: 11, color: COLORS.primary, fontStyle: 'italic' },
  itemInstruction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemInstructionText: { fontSize: 11, color: COLORS.amber, fontStyle: 'italic' },
  moreItemsText: { fontSize: 11, color: COLORS.onSurfaceVariant, textAlign: 'center', paddingTop: 4 },
  btnReceived: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primaryDim, borderWidth: 1, borderColor: `${COLORS.primary}30`, marginTop: 6 },
  btnReceivedText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  btnReady: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, backgroundColor: `${COLORS.primary}80`, marginTop: 6 },
  btnReadyFull: { backgroundColor: COLORS.primary },
  btnReadyText: { fontSize: 13, fontWeight: '700', color: COLORS.onPrimary },
  btnDeliver: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.greenDim, borderWidth: 1, borderColor: `${COLORS.green}40`, marginTop: 6 },
  btnDeliverText: { fontSize: 13, fontWeight: '700', color: COLORS.green },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 24, width: SCREEN_WIDTH * 0.9, maxHeight: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  modalScroll: { maxHeight: '70%' },
  modalOrderNumber: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primaryDim, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 16 },
  modalOrderNumberText: { fontSize: 16, fontWeight: '700', color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  modalProgressContainer: { marginBottom: 16 },
  modalProgressBar: { height: 8, backgroundColor: COLORS.surfaceContainerLow, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  modalProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  modalProgressText: { fontSize: 12, fontWeight: '600', color: COLORS.onSurfaceVariant, textAlign: 'right' },
  modalInfoRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  modalInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalInfoText: { fontSize: 13, color: COLORS.onSurfaceVariant },
  modalSpecialInstructions: { backgroundColor: COLORS.amberDim, padding: 12, borderRadius: 12, marginBottom: 16 },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginBottom: 8 },
  modalSpecialText: { fontSize: 13, color: COLORS.onSurfaceVariant },
  modalItemCard: { backgroundColor: COLORS.surfaceContainerLow, borderRadius: 12, padding: 12, marginBottom: 8 },
  modalItemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  modalItemContent: { flex: 1, gap: 4 },
  modalItemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  modalItemQuantity: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  modalItemName: { fontSize: 14, fontWeight: '600', color: COLORS.onSurface, flex: 1 },
  modalItemDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  modalItemCustomization: { paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: COLORS.primary },
  modalItemCustomizationText: { fontSize: 12, color: COLORS.primary },
  modalItemInstruction: { paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: COLORS.amber },
  modalItemInstructionText: { fontSize: 12, color: COLORS.amber, fontStyle: 'italic' },
  modalActions: { marginTop: 16, gap: 10 },
  modalStartButton: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalStartButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.onPrimary },
  modalReadyButton: { backgroundColor: `${COLORS.primary}80`, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalReadyButtonFull: { backgroundColor: COLORS.primary },
  modalReadyButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.onPrimary },
  modalDeliverButton: { backgroundColor: COLORS.green, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalDeliverButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.onPrimary },
});