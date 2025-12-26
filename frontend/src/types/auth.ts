export type Role = 'viewer' | 'blessed' | 'admin';

export interface OtpRequestOut {
  status: 'ok' | 'rate_limited';
  expires_in_seconds: number;
  retry_after_seconds?: number;
}

export interface OtpVerifyOut {
  status: 'ok' | 'invalid' | 'locked' | 'unrequested';
  role: Role;
  attempts_remaining: number;
  retry_after_seconds: number;
}

export interface Session {
  username: string;
  role: Role;
  expires_at: string;
}
