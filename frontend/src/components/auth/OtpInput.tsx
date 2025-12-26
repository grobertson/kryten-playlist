import { forwardRef, type InputHTMLAttributes, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(
  ({ value, onChange, length = 8, className, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Handle paste - accept alphanumeric (OTP uses A-Z and 0-9)
    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').slice(0, length);
      // Allow uppercase letters and digits, convert to uppercase
      onChange(pasted.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    };

    // Handle input change - accept alphanumeric
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow uppercase letters and digits, convert to uppercase
      const newValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, length);
      onChange(newValue);
    };

    return (
      <input
        ref={ref || inputRef}
        type="text"
        inputMode="text"
        autoComplete="one-time-code"
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        maxLength={length}
        className={cn(
          'h-12 w-full rounded-md border bg-surface px-4 text-center text-xl font-mono tracking-[0.3em] text-text placeholder-text-subdued transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
          'border-border',
          className
        )}
        placeholder={'•'.repeat(length)}
        {...props}
      />
    );
  }
);

OtpInput.displayName = 'OtpInput';
