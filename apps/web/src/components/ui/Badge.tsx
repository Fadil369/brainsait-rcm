'use client'

import type { ReactNode } from 'react'

import { useLocaleDirection } from '@/hooks/useLocaleDirection'
import { cn } from '@/lib/utils'

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'muted'

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  locale?: string
  className?: string
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-secondary/70 text-secondary-foreground border border-white/10',
  brand: 'bg-brand-orange/90 text-white border border-brand-orange/40 shadow-glow',
  success: 'bg-success/20 text-success border border-success/40',
  warning: 'bg-warning/15 text-warning border border-warning/40',
  danger: 'bg-danger/15 text-danger border border-danger/35',
  info: 'bg-info/15 text-info border border-info/35',
  outline: 'bg-transparent text-foreground border border-foreground/30',
  muted: 'bg-muted/40 text-muted-foreground border border-muted-foreground/40',
}

export function Badge({ tone = 'neutral', children, locale, className }: BadgeProps) {
  const { typographyClass } = useLocaleDirection(locale)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-shadow duration-150',
        typographyClass,
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
