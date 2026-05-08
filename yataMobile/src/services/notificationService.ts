// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URLS } from './config';

export const notificationService = {

    async registerDeviceToken(userId: string) {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                console.warn('❌ Permisos de notificación denegados');
                return;
            }

            const token = (await Notifications.getExpoPushTokenAsync()).data;
            console.log('✅ Expo Push Token:', token);

            const backendToken = await AsyncStorage.getItem('userToken');

            const res = await fetch(`${URLS.NOTIFICATION}/notifications/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
                },
                body: JSON.stringify({ user_id: userId, expo_token: token }),
            });

            if (res.ok) {
                console.log('✅ Token registrado correctamente en el backend');
                await AsyncStorage.setItem('expoPushToken', token);
            } else {
                console.error('❌ Error backend:', res.status, await res.text());
            }
        } catch (error) {
            console.error('❌ Error registrando token:', error);
        }
    },

    async getUnreadCount(userId: string): Promise<number> {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(
                `${URLS.NOTIFICATION}/notifications/${userId}/unread-count`,
                { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
            );
            if (!res.ok) return 0;
            const data = await res.json();
            return data.unread ?? 0;
        } catch {
            return 0;
        }
    },

    async markAllRead(userId: string): Promise<void> {
        try {
            const token = await AsyncStorage.getItem('userToken');
            await fetch(`${URLS.NOTIFICATION}/notifications/${userId}/read-all`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
        } catch { }
    },

    setupNotificationListener() {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        const received = Notifications.addNotificationReceivedListener(n => {
            console.log('📬 Notificación recibida:', n);
        });

        const response = Notifications.addNotificationResponseReceivedListener(r => {
            console.log('👆 Notificación tocada:', r.notification.request.content.data);
        });

        return () => { received.remove(); response.remove(); };
    }
};