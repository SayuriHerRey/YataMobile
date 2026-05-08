// src/navigation/RootNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import SplashScreen from '../screens/auth/SplashScreen';
import LoginUnificadoScreen from '../screens/auth/LoginUnificadoScreen';
import StudentStack from './StudentStack';
import StaffStack from './StaffStack';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="LoginUnificado" component={LoginUnificadoScreen} />
      <Stack.Screen name="StudentStack" component={StudentStack} />
      <Stack.Screen name="StaffStack" component={StaffStack} />
    </Stack.Navigator>
  );
}