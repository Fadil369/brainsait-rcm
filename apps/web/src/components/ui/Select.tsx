'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError = false, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white shadow-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent/60',
          hasError ? 'border-danger/60 focus:ring-danger/70' : undefined,
          'disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';
