'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
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

Textarea.displayName = 'Textarea';
