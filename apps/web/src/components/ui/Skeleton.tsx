import { cn } from '@/utils/cn'

export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  count?: number
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const baseClass = 'animate-pulse bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 bg-[length:200%_100%]'
  
  const variantClass = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  }[variant]

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  if (count === 1) {
    return (
      <div
        className={cn(baseClass, variantClass, className)}
        style={style}
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(baseClass, variantClass, className)}
          style={style}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

// Common skeleton patterns
export function SkeletonCard() {
  return (
    <div className="p-6 rounded-lg border border-surface-border bg-surface-base/50 space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={120} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="w-20 h-8" />
        <Skeleton variant="rectangular" className="w-20 h-8" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-4 pb-3 border-b border-surface-border">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="text" className="h-5" />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, j) => (
            <Skeleton key={j} variant="text" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-surface-border">
            <Skeleton variant="text" className="w-1/2 mb-2" />
            <Skeleton variant="text" className="w-3/4 h-8" />
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <div className="p-6 rounded-lg border border-surface-border">
        <Skeleton variant="text" className="w-1/4 mb-4 h-6" />
        <Skeleton variant="rectangular" height={300} />
      </div>
      
      {/* Table */}
      <div className="p-6 rounded-lg border border-surface-border">
        <Skeleton variant="text" className="w-1/4 mb-4 h-6" />
        <SkeletonTable rows={8} />
      </div>
    </div>
  )
}
