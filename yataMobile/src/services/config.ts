// src/services/config.ts

export const URLS = {
    AUTH: 'http://192.168.1.66:8004',
    ORDER: 'http://192.168.1.66:8000',
    NOTIFICATION: 'http://192.168.1.66:8001',
    PRODUCT: 'http://192.168.1.66:8002',
    PAYMENT: 'http://192.168.1.66:8003',
    ANALYTICS: 'http://192.168.1.66:8005',
};

// ─── Sesión de usuario ────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionUser {
    user_id: string;
    email: string;
    name: string;
    role: 'student' | 'staff';
    access_token: string;
    refresh_token: string;

    // opcionales (puede que backend no los mande aún)
    phone?: string;
    student_id?: string;
    career?: string;
    semester?: string;
    avatar?: string;
    default_payment_method?: string;
}

export interface AppUser {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'staff';

    phone: string;
    studentId: string;
    career: string;
    semester: string;
    avatar: string;
    defaultPaymentMethodId: string;
}

export const Session = {

    /**
     * Guardar usuario 
     */
    setUser: async (userData: SessionUser): Promise<boolean> => {
        try {
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            await AsyncStorage.setItem('userToken', userData.access_token);
            return true;
        } catch (error) {
            console.error('❌ Error guardando usuario:', error);
            return false;
        }
    },

    /**
     * Obtener usuario RAW (
     */
    getRawUser: async (): Promise<SessionUser | null> => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    },

    getUser: async (): Promise<AppUser | null> => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            if (!userStr) return null;

            const userData: SessionUser = JSON.parse(userStr);

            return {
                id: userData.user_id,
                email: userData.email,
                name: userData.name,
                role: userData.role,

                phone: userData.phone || '',
                studentId: userData.student_id || '',
                career: userData.career || 'No especificada',
                semester: userData.semester || 'No especificado',
                avatar:
                    userData.avatar ||
                    `https://ui-avatars.com/api/?background=630ED4&color=fff&name=${encodeURIComponent(userData.name)}`,
                defaultPaymentMethodId:
                    userData.default_payment_method || 'efectivo_1',
            };
        } catch (error) {
            console.error('❌ Error obteniendo usuario:', error);
            return null;
        }
    },

    clearSession: async (): Promise<boolean> => {
        try {
            await AsyncStorage.multiRemove(['user', 'userToken']);
            console.log('✅ Sesión eliminada correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error eliminando sesión:', error);
            return false;
        }
    },

    isAuthenticated: async (): Promise<boolean> => {
        const user = await Session.getUser();
        return user !== null;
    },

    updateUser: async (updates: Partial<SessionUser>): Promise<AppUser | null> => {
        try {
            const currentUser = await Session.getRawUser();

            if (currentUser) {
                const updatedUser = { ...currentUser, ...updates };
                await Session.setUser(updatedUser);
                return await Session.getUser();
            }

            return null;
        } catch {
            return null;
        }
    },
};