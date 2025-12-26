import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OtpInput } from './OtpInput';
import { ApiError } from '@/api/client';
import type { Role } from '@/types/auth';

type LoginStep = 'username' | 'otp' | 'unsolicited';

interface LoginFormProps {
  onSuccess: (role: Role) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [step, setStep] = useState<LoginStep>('username');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useAuthStore((s) => s.setAuth);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'username') {
      usernameInputRef.current?.focus();
    } else if (step === 'otp') {
      otpInputRef.current?.focus();
    }
  }, [step]);

  const requestOtpMutation = useMutation({
    mutationFn: () => authApi.requestOtp(username),
    onSuccess: (data) => {
      setExpiresIn(data.expires_in_seconds);
      setStep('otp');
      setError(null);
    },
    onError: (err: ApiError) => {
      setError(err.message);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () => authApi.verifyOtp(username, otp),
    onSuccess: (data) => {
      if (data.status === 'ok') {
        setAuth(username, data.role);
        onSuccess(data.role);
      } else if (data.status === 'unrequested') {
        setStep('unsolicited');
      } else if (data.status === 'invalid') {
        setError(`Invalid OTP. ${data.attempts_remaining} attempts remaining.`);
      } else if (data.status === 'locked') {
        setError(
          `Too many attempts. Try again in ${Math.ceil(data.retry_after_seconds / 60)} minutes.`
        );
      }
    },
    onError: (err: ApiError) => {
      setError(err.message);
    },
  });

  const handleStartOver = () => {
    setStep('username');
    setOtp('');
    setError(null);
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-md bg-error-muted p-3 text-sm text-error">
          {error}
        </div>
      )}

      {step === 'username' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (username.trim()) {
              requestOtpMutation.mutate();
            }
          }}
        >
          <label className="mb-2 block text-sm text-text-muted">
            CyTube Username
          </label>
          <Input
            ref={usernameInputRef}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
          <Button
            type="submit"
            className="mt-4 w-full"
            loading={requestOtpMutation.isPending}
            disabled={!username.trim()}
          >
            Request OTP
          </Button>
        </form>
      )}

      {step === 'otp' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (otp.length >= 8) {
              verifyOtpMutation.mutate();
            }
          }}
        >
          <p className="mb-4 text-sm text-text-muted">
            An OTP has been sent to you via CyTube PM. It expires in{' '}
            {Math.ceil(expiresIn / 60)} minutes.
          </p>
          <label className="mb-2 block text-sm text-text-muted">
            Enter OTP
          </label>
          <OtpInput ref={otpInputRef} value={otp} onChange={setOtp} />
          <Button
            type="submit"
            className="mt-4 w-full"
            loading={verifyOtpMutation.isPending}
            disabled={otp.length < 8}
          >
            Verify
          </Button>
          <button
            type="button"
            onClick={handleStartOver}
            className="mt-3 w-full text-sm text-text-muted hover:text-text"
          >
            Use a different username
          </button>
        </form>
      )}

      {step === 'unsolicited' && (
        <div>
          <p className="mb-4 text-sm text-warning">
            No OTP request was found for this username. Did you request this
            OTP?
          </p>
          <p className="mb-4 text-sm text-text-muted">
            If you didn't request an OTP, someone may be trying to access your
            account.
          </p>
          <Button onClick={handleStartOver} className="w-full">
            Start Over
          </Button>
        </div>
      )}
    </div>
  );
}
