import type { SVGProps } from 'react'

import { cn } from '@/lib/utils'

export type IconName =
  | 'brain'
  | 'spark'
  | 'alert'
  | 'shield-check'
  | 'warning'
  | 'info'
  | 'chevron-right'
  | 'chevron-left'
  | 'globe'
  | 'sun'
  | 'moon'
  | 'pulse'

type IconComponent = (props: SVGProps<SVGSVGElement>) => JSX.Element

const strokeProps = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const BrainIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} {...strokeProps} {...props}>
    <path d="M9 3.5c-1.8 0-3 1.3-3 3v1.2A3.5 3.5 0 0 0 3.5 11v1c0 1.3.7 2.4 1.8 3A3.6 3.6 0 0 0 7 18.5c0 1.5 1.2 2.8 2.7 3M15 3.5c1.8 0 3 1.3 3 3v1.2A3.5 3.5 0 0 1 20.5 11v1c0 1.3-.7 2.4-1.8 3a3.6 3.6 0 0 1-1.7 3.5C17 20 15.8 21.3 14.3 21.5" />
    <path d="M9 7c0 1.2.6 2.3 1.6 3" />
    <path d="M15 7c0 1.2-.6 2.3-1.6 3" />
    <path d="M12 2v20" />
  </svg>
)

const SparkIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} {...strokeProps} {...props}>
    <path d="M12 3v4" />
    <path d="M12 17v4" />
    <path d="M5.2 5.2l2.8 2.8" />
    <path d="M16 16l2.8 2.8" />
    <path d="M3 12h4" />
    <path d="M17 12h4" />
    <path d="M5.2 18.8 8 16" />
    <path d="M16 8l2.8-2.8" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
)

const AlertTriangleIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} {...strokeProps} {...props}>
    <path d="m12 3 9 16H3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
)

const ShieldCheckIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} {...strokeProps} {...props}>
    <path d="M12 3 4.5 6v5c0 4.6 3.1 8.8 7.5 10 4.4-1.2 7.5-5.4 7.5-10V6Z" />
    <path d="m8.8 12 2.2 2.2 4.2-4.2" />
  </svg>
)

const InfoIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} {...strokeProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01" />
    <path d="M11 12h1v4h1" />
  </svg>
)

const ChevronRightIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} {...strokeProps} {...props}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const ChevronLeftIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} {...strokeProps} {...props}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)

const GlobeIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} {...strokeProps} {...props}>
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
    <path d="M3 12h18" />
    <path d="M12 3c3 3.5 3 14 0 18-3-4-3-14 0-18Z" />
  </svg>
)

const SunIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} {...strokeProps} {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.42 1.42" />
    <path d="m17.65 17.65 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.35 17.65-1.42 1.42" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
)

const MoonIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} {...strokeProps} {...props}>
    <path d="M21 12.79A9 9 0 0 1 11.21 3a7.5 7.5 0 1 0 9.79 9.79Z" />
  </svg>
)

const PulseIcon: IconComponent = ({ className, ...props }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} {...strokeProps} {...props}>
    <path d="M2 12h4l2-5 4 14 3-9h7" />
  </svg>
)

const ICON_MAP: Record<IconName, IconComponent> = {
  brain: BrainIcon,
  spark: SparkIcon,
  alert: AlertTriangleIcon,
  'shield-check': ShieldCheckIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-left': ChevronLeftIcon,
  globe: GlobeIcon,
  sun: SunIcon,
  moon: MoonIcon,
  pulse: PulseIcon,
}

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
}

export function Icon({ name, className, ...props }: IconProps) {
  const Component = ICON_MAP[name]

  if (!Component) {
    return null
  }

  return <Component className={cn(className)} {...props} />
}
