// src/services/authService.ts

import { URLS, Session, SessionUser } from './config';

export interface LoginResult {
    success: boolean;
    user?: SessionUser;
    error?: string;
}

export const authService = {

    /**
     * Iniciar sesión contra el auth-service real.
     */
    async login(email: string, password: string): Promise<LoginResult> {
        try {
            const response = await fetch(`${URLS.AUTH}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                return { success: false, error: errData.detail ?? 'Correo o contraseña incorrectos' };
            }

            const data = await response.json();

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
        } catch (err) {
            console.error('[authService.login]', err);
            return { success: false, error: 'No se pudo conectar al servidor. Verifica tu red.' };
        }
    },

    /**
     * Registrar un nuevo usuario.
     */
    async register(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`${URLS.AUTH}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                return { success: false, error: errData.detail ?? 'Error al registrar usuario' };
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: 'No se pudo conectar al servidor.' };
        }
    },

    /**
     * Cerrar sesión.
     */
    async logout(): Promise<void> {
        const user = await Session.getRawUser();
        if (user?.refresh_token) {
            try {
                await fetch(`${URLS.AUTH}/api/v1/auth/logout?refresh_token=${user.refresh_token}`, {
                    method: 'POST',
                });
            } catch {
                /* silencioso */
            }
        }
        await Session.clearSession();
    },
};