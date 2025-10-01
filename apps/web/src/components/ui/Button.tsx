'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-brainsait-cyan to-brainsait-blue text-white shadow-glow hover:shadow-neon',
  secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
  ghost: 'bg-transparent text-white hover:bg-white/10 border border-transparent',
  danger: 'bg-danger/80 text-white hover:bg-danger'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-8 text-base'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth,
      loading = false,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60 gap-2',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? 'w-full' : undefined,
          loading ? 'cursor-progress' : undefined,
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <span className="absolute inset-y-0 left-3 flex items-center">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-white" />
          </span>
        )}
        {icon && !loading && (
          <span className="text-lg" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={loading && !icon ? 'opacity-70' : undefined}>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
