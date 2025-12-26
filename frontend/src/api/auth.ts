import { api } from './client';
import type { OtpRequestOut, OtpVerifyOut, Session } from '@/types/auth';

export const authApi = {
  requestOtp: (username: string) =>
    api.post<OtpRequestOut>('/auth/otp/request', { username }),

  verifyOtp: (username: string, otp: string) =>
    api.post<OtpVerifyOut>('/auth/otp/verify', { username, otp }),

  logout: () => api.post<void>('/auth/logout'),

  getSession: () => api.get<Session>('/auth/session'),
};
