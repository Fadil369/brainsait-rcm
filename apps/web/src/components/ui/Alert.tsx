'use client'

import type { HTMLAttributes, ReactNode } from 'react'

import { useLocaleDirection } from '@/hooks/useLocaleDirection'
import { cn } from '@/lib/utils'

import { Icon, type IconName } from './Icon'

type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

type VariantConfig = {
  wrapper: string
  badge: string
  icon: IconName
}

const variants: Record<AlertVariant, VariantConfig> = {
  info: {
    wrapper: 'border-info/40 bg-info/10 text-info',
    badge: 'bg-info/20 text-info border-info/30',
    icon: 'spark',
  },
  success: {
    wrapper: 'border-success/45 bg-success/10 text-success',
    badge: 'bg-success/20 text-success border-success/30',
    icon: 'shield-check',
  },
  warning: {
    wrapper: 'border-warning/45 bg-warning/10 text-warning',
    badge: 'bg-warning/20 text-warning border-warning/30',
    icon: 'warning',
  },
  danger: {
    wrapper: 'border-danger/45 bg-danger/10 text-danger',
    badge: 'bg-danger/20 text-danger border-danger/30',
    icon: 'alert',
  },
  neutral: {
    wrapper: 'border-muted-foreground/25 bg-muted/30 text-foreground',
    badge: 'bg-muted/40 text-muted-foreground border-muted-foreground/30',
    icon: 'info',
  },
}

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  heading?: ReactNode
  description?: ReactNode
  variant?: AlertVariant
  locale?: string
  action?: ReactNode
}

export function Alert({
  className,
  heading,
  description,
  variant = 'info',
  locale,
  action,
  children,
  ...props
}: AlertProps) {
  const { typographyClass } = useLocaleDirection(locale)
  const config = variants[variant]

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-4 rounded-2xl border px-5 py-4 shadow-sm backdrop-blur-sm transition-all duration-200',
        config.wrapper,
        typographyClass,
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-full border text-base', config.badge)}>
          <Icon name={config.icon} className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex-1 space-y-1">
          {heading ? <h4 className="text-sm font-semibold leading-snug text-current">{heading}</h4> : null}
          {description ? <p className="text-sm leading-relaxed text-current/90">{description}</p> : null}
          {children}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
