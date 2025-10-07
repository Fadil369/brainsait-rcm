'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { useLocaleDirection } from '@/hooks/useLocaleDirection';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  locale?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-brand-orange/90 via-brand-orange to-brand-orange/80 text-white shadow-glow hover:shadow-neon focus-visible:ring-brand-orange/40',
  secondary:
    'bg-secondary/80 text-secondary-foreground border border-white/10 hover:bg-secondary/60 focus-visible:ring-secondary/40',
  ghost:
    'bg-transparent text-foreground hover:bg-foreground/5 border border-transparent focus-visible:ring-foreground/15',
  danger:
    'bg-danger/90 text-white hover:bg-danger focus-visible:ring-danger/40'
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
      locale,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const { typographyClass } = useLocaleDirection(locale);

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 gap-2 shadow-sm',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? 'w-full' : undefined,
          loading ? 'cursor-progress' : undefined,
          typographyClass,
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
