import api from './axios';
import { unwrap } from './utils';

export interface TwoFactorStatus {
  enabled: boolean;
}

export interface TwoFactorSetupData {
  qrCode: string;
  secret: string;
}

export const get2FAStatus = (): Promise<TwoFactorStatus> => api.get('/api/2fa/status').then(unwrap);

export const generate2FA = (): Promise<TwoFactorSetupData> =>
  api.post('/api/2fa/generate').then(unwrap);

export const enable2FA = (token: string): Promise<void> =>
  api.post('/api/2fa/enable', { token }).then(() => undefined);

export const disable2FA = (token: string): Promise<void> =>
  api.post('/api/2fa/disable', { token }).then(() => undefined);

export const verifyLogin2FA = (
  tempToken: string,
  token: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ success: boolean; data: { user: any; tokenInfo: any } }> =>
  api.post('/2fa/verify-login', { tempToken, token }).then(res => res.data);
