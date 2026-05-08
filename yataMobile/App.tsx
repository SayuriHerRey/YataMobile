import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import { ProductProvider } from './src/contexts/ProductContext';
import { notificationService } from './src/services/notificationService';

export default function App() {

  useEffect(() => {

    const cleanup = notificationService.setupNotificationListener();
    return cleanup;
  }, []);

  return (
    <SafeAreaProvider>
      <ProductProvider>
        <NavigationContainer>
          <StatusBar style="auto" translucent />
          <RootNavigator />
        </NavigationContainer>
      </ProductProvider>
    </SafeAreaProvider>
  );
}
