// src/navigation/StudentStack.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../types';
import StudentTabs from './StudentTabs';
import DetalleProductoScreen from '../screens/student/DetalleProductoScreen';
import CheckoutScreen from '../screens/student/CheckoutScreen';
import SeguimientoScreen from '../screens/student/SeguimientoScreen';

const Stack = createNativeStackNavigator<StudentStackParamList>();

export default function StudentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentTabs" component={StudentTabs} />
      <Stack.Screen name="DetalleProducto" component={DetalleProductoScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Seguimiento" component={SeguimientoScreen} />
    </Stack.Navigator>
  );
}