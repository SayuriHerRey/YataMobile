// src/navigation/StaffStack.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StaffStackParamList } from '../types';
import StaffHomeScreen from '../screens/kitchen/StaffHomeScreen';
import KDSScreen from '../screens/kitchen/KDSScreen';
import GestionMenuScreen from '../screens/kitchen/GestionMenuScreen';
import EstadisticasScreen from '../screens/kitchen/EstadisticasScreen';
import StaffPerfilScreen from '../screens/kitchen/StaffPerfilScreen';

const Stack = createNativeStackNavigator<StaffStackParamList>();

export default function StaffStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffHome" component={StaffHomeScreen} />
      <Stack.Screen name="KDS" component={KDSScreen} />
      <Stack.Screen name="GestionMenu" component={GestionMenuScreen} />
      <Stack.Screen name="Estadisticas" component={EstadisticasScreen} />
      <Stack.Screen name="StaffPerfil" component={StaffPerfilScreen} />
    </Stack.Navigator>
  );
}