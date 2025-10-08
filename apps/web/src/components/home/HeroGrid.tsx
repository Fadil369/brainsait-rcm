'use client'

import { motion } from 'framer-motion'
import { listContainer, listItem, transition } from '@/lib/animation-primitives'
import { cn } from '@/utils/cn'

export interface MetricCardProps {
  title: string
  titleAr?: string
  value: string | number
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
  icon?: string
  sparklineData?: number[]
  onClick?: () => void
  locale?: 'en' | 'ar'
  className?: string
}

function formatValue(value: string | number): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return value
}

export function MetricCard({
  title,
  titleAr,
  value,
  trend,
  trendDirection = 'neutral',
  icon,
  sparklineData,
  onClick,
  locale = 'en',
  className,
}: MetricCardProps) {
  const displayTitle = locale === 'ar' && titleAr ? titleAr : title
  const formattedValue = formatValue(value)
  
  const trendColorClass = {
    up: 'text-success',
    down: 'text-danger',
    neutral: 'text-muted-foreground',
  }[trendDirection]

  const trendIcon = {
    up: '↗',
    down: '↘',
    neutral: '→',
  }[trendDirection]

  return (
    <motion.div
      variants={listItem}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={transition.default}
      onClick={onClick}
      className={cn(
        'group relative p-6 rounded-xl border border-surface-border backdrop-blur-md overflow-hidden',
        'bg-gradient-to-br from-surface-base/80 to-surface-strong/60',
        'hover:border-accent/30 hover:shadow-glow transition-all duration-220',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-radial-spot opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {displayTitle}
          </h3>
          {icon && <span className="text-2xl opacity-70">{icon}</span>}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-foreground">
            {formattedValue}
          </span>
          {trend && (
            <span className={cn('text-sm font-medium flex items-center gap-1', trendColorClass)}>
              <span className="text-base">{trendIcon}</span>
              {trend}
            </span>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="h-12 mt-4">
            <MiniSparkline data={sparklineData} />
          </div>
        )}
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-accent/5 rounded-full blur-3xl" />
      </div>
    </motion.div>
  )
}

function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  const isPositive = data[data.length - 1] >= data[0]

  return (
    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        fill="url(#sparkline-gradient)"
        points={`0,100 ${points} 100,100`}
      />
    </svg>
  )
}

export interface HeroGridProps {
  metrics: MetricCardProps[]
  locale?: 'en' | 'ar'
}

export function HeroGrid({ metrics, locale = 'en' }: HeroGridProps) {
  return (
    <motion.div
      variants={listContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} locale={locale} />
      ))}
    </motion.div>
  )
}
