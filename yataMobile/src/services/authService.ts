// src/services/authService.ts
import axios from 'axios';
import { URLS, Session, SessionUser } from './config';

export interface LoginResult {
    success: boolean;
    user?: SessionUser;
    error?: string;
}

export const authService = {

    async login(email: string, password: string): Promise<LoginResult> {
        try {
            const response = await axios.post(`${URLS.AUTH}/api/v1/auth/login`,
                { email, password },
                { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
            );

            const data = response.data;
            const user: SessionUser = {
                user_id: data.user_id,
                email: data.email,
                name: data.name,
                role: data.role,
                access_token: data.access_token,
                refresh_token: data.refresh_token,
            };

            await Session.setUser(user);
            return { success: true, user };
        } catch (err: any) {
            console.error('[authService.login]', err);
            const msg = err?.response?.data?.detail ?? 'No se pudo conectar al servidor.';
            return { success: false, error: msg };
        }
    },

    async register(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
        try {
            await axios.post(`${URLS.AUTH}/api/v1/auth/register`,
                { email, password, name },
                { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
            );
            return { success: true };
        } catch (err: any) {
            const msg = err?.response?.data?.detail ?? 'Error al registrar usuario';
            return { success: false, error: msg };
        }
    },

    async logout(): Promise<void> {
        const user = await Session.getRawUser();
        if (user?.refresh_token) {
            try {
                await axios.post(`${URLS.AUTH}/api/v1/auth/logout?refresh_token=${user.refresh_token}`);
            } catch { /* silencioso */ }
        }
        await Session.clearSession();
    },
};