'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError = false, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white shadow-sm transition-all duration-200 placeholder:text-white/40 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent/60',
          hasError ? 'border-danger/60 focus:ring-danger/70' : undefined,
          'disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
