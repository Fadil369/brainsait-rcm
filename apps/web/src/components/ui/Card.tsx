import type { HTMLAttributes } from 'react'

import { getDirection, getLocaleTypographyClass } from '@/hooks/useLocaleDirection'
import { cn } from '@/lib/utils'

type CardVariant = 'solid' | 'glass' | 'borderless'
type CardTone = 'default' | 'brand' | 'subtle'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  tone?: CardTone
  locale?: string
}

const variantStyles: Record<CardVariant, string> = {
  solid: 'bg-surface-base/80 border border-white/10 shadow-sm',
  glass: 'glass-morphism border border-white/10 shadow-glow',
  borderless: 'bg-transparent border border-transparent',
}

const toneStyles: Record<CardTone, string> = {
  default: 'text-foreground',
  brand: 'bg-brand-navy/70 text-white border-brand-navy/40 shadow-glow',
  subtle: 'bg-secondary/80 text-secondary-foreground border-white/10',
}

export function Card({
  className,
  variant = 'solid',
  tone = 'default',
  locale,
  ...props
}: CardProps) {
  const dir = getDirection(locale)
  const typographyClass = getLocaleTypographyClass(locale)

  return (
    <div
      dir={dir}
      className={cn(
        'group relative overflow-hidden rounded-2xl transition-all duration-200',
        variantStyles[variant],
        toneStyles[tone],
        typographyClass,
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2 px-6 pt-6', className)} {...props} />
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-display font-semibold leading-tight text-foreground', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground leading-relaxed', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6 pt-4 flex items-center justify-between gap-3', className)} {...props} />
}
