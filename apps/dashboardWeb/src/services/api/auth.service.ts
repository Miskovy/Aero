import { apiClient } from "@/lib/api-client";

export const authService = {

    async login(email: string, password: string) {
        return apiClient<{ access_token: string }>(`auth/login`, {
            method: 'POST',
            body: { email, password },
        });
    },

    async refreshToken() {
        return apiClient<{ access_token: string }>(`auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });
    },

    async logout() {
        return apiClient(`auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
    },

    async forgotPassword(email: string) {
        return await apiClient<boolean>(`auth/forgot-password`, {
            method: 'POST',
            body: { email },
        });
    },

    async verifyPIN(email: string, pin: string) {
        return apiClient<{ success: boolean }>(`auth/verify-reset-pin`, {
            method: 'POST',
            body: { email, pin },
        });
    },

    async resetPassword(email: string, pin: string, password: string) {
        return apiClient<{ success: boolean }>(`auth/reset-password`, {
            method: 'POST',
            body: { email, pin, password },
        });
    },

}