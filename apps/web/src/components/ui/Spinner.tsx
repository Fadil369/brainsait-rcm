import { motion } from 'framer-motion'
import { spinnerVariants } from '@/lib/animation-primitives'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'white' | 'accent' | 'muted'
  className?: string
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-[3px]',
}

const colorMap = {
  primary: 'border-accent border-t-transparent',
  white: 'border-white border-t-transparent',
  accent: 'border-brand-orange border-t-transparent',
  muted: 'border-muted border-t-transparent',
}

export function Spinner({ size = 'md', color = 'primary', className = '' }: SpinnerProps) {
  return (
    <motion.div
      className={`rounded-full ${sizeMap[size]} ${colorMap[color]} ${className}`}
      variants={spinnerVariants}
      animate="rotating"
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </motion.div>
  )
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" color="white" />
        {message && <p className="text-white text-sm font-medium">{message}</p>}
      </div>
    </div>
  )
}
