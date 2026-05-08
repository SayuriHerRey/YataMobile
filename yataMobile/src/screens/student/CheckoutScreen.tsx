// src/screens/student/CheckoutScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

// ✅ IMPORTS REALES
import { orderService } from '../../services/orderService';
import { processPayment } from '../../services/paymentService'; // ✅ IMPORT NUEVO
import { Session } from '../../services/config';
import { useCartStore } from '../../store/cartStore';

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
  outline: '#7B7487',
  outlineVariant: '#CCC3D8',
  error: '#BA1A1A',
};

type PaymentMethod = 'card' | 'cash';

interface CardFormData {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

const MOCK_USER = {
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuARm1f6uRHvdlyTriTFdd4T5WeLoHHFfzPkYLkXvQXpTJg3HJShK5YN5c2otU437_0yxMUAXngKHTknjxxBCF3eVmogWa75X1wGp9XWmTaiux906Nsn6vlxI8cCyHDYehB0pPn467uYAJ16lV77HBgOD9RHintb1g2YE_OL6LwhDcml_o7xNCpi9PEuGHCOUJqNCCI7lMyIutBsrGmehrd-gWg3sEX8bI1hUEvhn87djwLqouNWnmeQUGspwCJ4',
};

export default function CheckoutScreen({ navigation }: any) {
  const route = useRoute<any>();
  const ORDER_TOTAL: number = route.params?.total ?? 0;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardData, setCardData] = useState<CardFormData>({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });
  const [generateReceipt, setGenerateReceipt] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGoBack = () => navigation.goBack();

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancelar pedido',
      '¿Estás seguro de que deseas cancelar? Los productos seguirán en tu carrito.',
      [
        { text: 'Seguir comprando', style: 'cancel' },
        {
          text: 'Cancelar pedido',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleUpdateCardField = (field: keyof CardFormData, value: string) => {
    let formattedValue = value;
    if (field === 'number') {
      formattedValue = value
        .replace(/\D/g, '')
        .replace(/(\d{4})/g, '$1 ')
        .trim()
        .slice(0, 19);
    } else if (field === 'expiry') {
      formattedValue = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .slice(0, 5);
    } else if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    }
    setCardData((prev) => ({ ...prev, [field]: formattedValue }));
  };

  const handleConfirmOrder = async () => {
    if (paymentMethod === 'card') {
      if (cardData.number.replace(/\s/g, '').length < 16) {
        Alert.alert('Tarjeta inválida', 'Ingresa un número de tarjeta válido de 16 dígitos.');
        return;
      }
      if (cardData.cvv.length < 3) {
        Alert.alert('CVV inválido', 'Ingresa un CVV válido.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      const user = await Session.getUser();
      if (!user) {
        Alert.alert('Sesión expirada', 'Por favor inicia sesión nuevamente.');
        setIsProcessing(false);
        return;
      }

      const { items, clearCart } = useCartStore.getState();
      if (items.length === 0) {
        Alert.alert('Carrito vacío', 'Agrega productos antes de confirmar.');
        setIsProcessing(false);
        return;
      }

      console.log('💳 Creando pedido en backend:', {
        studentId: user.id,
        total: ORDER_TOTAL,
        paymentMethod,
        itemsCount: items.length,
        generateReceipt,
      });

      // PASO 1: Crear la orden en el order-service
      const order = await orderService.createOrder(
        user.id,
        items,
        paymentMethod,
        generateReceipt,
      );
      console.log('✅ Pedido creado:', order.id);

      // ✅ PASO 2 (NUEVO): Registrar el pago en el payment-service
      const payment = await processPayment({
        order_id: order.id,
        user_id: user.id,
        amount: ORDER_TOTAL,
        method: paymentMethod,
        generate_receipt: generateReceipt,
        card_last4: paymentMethod === 'card'
          ? cardData.number.replace(/\s/g, '').slice(-4)
          : null,
        card_holder: paymentMethod === 'card' ? cardData.name : null,
      });
      console.log('✅ Pago registrado:', payment.id, '| status:', payment.status);

      // Limpiar carrito tras pedido y pago exitosos
      clearCart();

      setIsProcessing(false);

      // Navegar con el ID real del backend (UUID)
      navigation.reset({
        index: 0,
        routes: [
          { name: 'StudentTabs' },
          { name: 'Seguimiento', params: { orderId: order.id } },
        ],
      });
    } catch (err: any) {
      console.error('❌ Error al crear el pedido/pago:', err);
      setIsProcessing(false);
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'No se pudo procesar el pedido. Verifica tu conexión e intenta de nuevo.';
      Alert.alert('Error al procesar pedido', msg);
    }
  };

  const renderCardForm = () => (
    <View style={styles.cardForm}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Número de tarjeta</Text>
        <TextInput
          style={styles.input}
          placeholder="0000 0000 0000 0000"
          placeholderTextColor={COLORS.outline}
          value={cardData.number}
          onChangeText={(value) => handleUpdateCardField('number', value)}
          keyboardType="number-pad"
          maxLength={19}
        />
      </View>
      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, styles.inputGroupHalf]}>
          <Text style={styles.inputLabel}>Fecha (MM/AA)</Text>
          <TextInput
            style={styles.input}
            placeholder="12/26"
            placeholderTextColor={COLORS.outline}
            value={cardData.expiry}
            onChangeText={(value) => handleUpdateCardField('expiry', value)}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={[styles.inputGroup, styles.inputGroupHalf]}>
          <Text style={styles.inputLabel}>CVV</Text>
          <TextInput
            style={styles.input}
            placeholder="***"
            placeholderTextColor={COLORS.outline}
            value={cardData.cvv}
            onChangeText={(value) => handleUpdateCardField('cvv', value)}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nombre en tarjeta</Text>
        <TextInput
          style={[styles.input, styles.inputUppercase]}
          placeholder="NOMBRE COMPLETO"
          placeholderTextColor={COLORS.outline}
          value={cardData.name}
          onChangeText={(value) => handleUpdateCardField('name', value.toUpperCase())}
          autoCapitalize="characters"
        />
      </View>
    </View>
  );

  const renderCashOption = () => (
    <TouchableOpacity
      style={[
        styles.paymentOption,
        paymentMethod === 'cash' && styles.paymentOptionSelected,
      ]}
      onPress={() => setPaymentMethod('cash')}
      activeOpacity={0.8}
    >
      <View style={styles.paymentOptionContent}>
        <MaterialCommunityIcons
          name="cash"
          size={24}
          color={paymentMethod === 'cash' ? COLORS.primary : COLORS.onSurfaceVariant}
        />
        <View style={styles.paymentOptionText}>
          <Text style={styles.paymentOptionTitle}>Efectivo</Text>
          <Text style={styles.paymentOptionSubtitle}>
            Paga en efectivo al recoger en ventanilla
          </Text>
        </View>
      </View>
      <View style={styles.radioButton}>
        <View
          style={[
            styles.radioButtonInner,
            paymentMethod === 'cash' && styles.radioButtonInnerSelected,
          ]}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <SafeAreaView style={styles.container}>
        <View
          style={[
            styles.topBar,
            { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
          ]}
        >
          <View style={styles.topBarLeft}>
            <TouchableOpacity style={styles.iconButton} onPress={handleGoBack}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Método de pago</Text>
          </View>
          <Image source={{ uri: MOCK_USER.avatar }} style={styles.avatar} />
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollPadding}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.totalSection}>
            <Text style={styles.checkoutLabel}>Checkout</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total a pagar</Text>
              <Text style={styles.totalValue}>${ORDER_TOTAL.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.paymentSection}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'card' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('card')}
              activeOpacity={0.8}
            >
              <View style={styles.paymentOptionContent}>
                <MaterialCommunityIcons
                  name="credit-card"
                  size={24}
                  color={paymentMethod === 'card' ? COLORS.primary : COLORS.onSurfaceVariant}
                />
                <Text style={styles.paymentOptionTitle}>
                  Tarjeta de Crédito / Débito
                </Text>
              </View>
              <View style={styles.radioButton}>
                <View
                  style={[
                    styles.radioButtonInner,
                    paymentMethod === 'card' && styles.radioButtonInnerSelected,
                  ]}
                />
              </View>
            </TouchableOpacity>

            {paymentMethod === 'card' && renderCardForm()}
            {renderCashOption()}
          </View>

          <View style={styles.securityBadge}>
            <MaterialCommunityIcons name="lock-outline" size={14} color={COLORS.onSurfaceVariant} />
            <Text style={styles.securityText}>Pago Seguro SSL</Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerButtonsContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, isProcessing && styles.disabledButton]}
              onPress={handleCancelOrder}
              activeOpacity={0.9}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, isProcessing && styles.disabledButton]}
              onPress={handleConfirmOrder}
              activeOpacity={0.9}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryContainer]}
                style={styles.confirmGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.confirmButtonText}>
                  {isProcessing ? 'Procesando...' : 'Confirmar'}
                </Text>
                <Text style={styles.confirmButtonPrice}>
                  ${ORDER_TOTAL.toFixed(2)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainer,
  },
  scrollContent: { flex: 1 },
  scrollPadding: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 140 },
  totalSection: { marginBottom: 32 },
  checkoutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalLabel: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  paymentSection: { gap: 16, marginBottom: 24 },
  paymentOption: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionText: { flex: 1, marginLeft: 8 },
  paymentOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  paymentOptionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  paymentOptionSubtitle: { fontSize: 14, color: COLORS.onSurfaceVariant, marginTop: 2 },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  radioButtonInnerSelected: { backgroundColor: COLORS.primary },
  cardForm: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginTop: 8,
  },
  inputGroup: { gap: 8 },
  inputGroupHalf: { flex: 1 },
  inputRow: { flexDirection: 'row', gap: 16 },
  inputLabel: { fontSize: 12, fontWeight: '500', color: COLORS.outline, paddingHorizontal: 4 },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputUppercase: { textTransform: 'uppercase' },
  receiptCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiptContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  receiptText: { fontSize: 14, fontWeight: '500', color: COLORS.onSurface },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    opacity: 0.6,
  },
  securityText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomSpacer: { height: 24 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    backgroundColor: `${COLORS.surface}CC`,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
  },
  footerButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    minHeight: 56,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    textAlign: 'center',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 56,
  },
  confirmGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onPrimary,
    textAlign: 'center',
  },
  confirmButtonPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.onPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
});