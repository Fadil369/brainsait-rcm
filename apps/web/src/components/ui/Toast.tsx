'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { notificationVariants, transition } from '@/lib/animation-primitives'

export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom' | 'center'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  position?: ToastPosition
}

interface ToastProps extends Toast {
  onDismiss: (id: string) => void
}

const iconMap: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
}

const colorMap: Record<ToastType, string> = {
  success: 'bg-success/10 border-success/30 text-success',
  error: 'bg-danger/10 border-danger/30 text-danger',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  info: 'bg-info/10 border-info/30 text-info',
}

function ToastItem({ id, type, title, message, duration = 5000, position = 'top-right', onDismiss }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(id), duration)
      return () => clearTimeout(timer)
    }
  }, [duration, id, onDismiss])

  const positionVariant = position === 'top-right' ? notificationVariants.topRight
    : position === 'top-left' ? notificationVariants.topLeft
    : position === 'bottom' ? notificationVariants.bottom
    : notificationVariants.center

  return (
    <motion.div
      layout
      initial="initial"
      animate="animate"
      exit="exit"
      variants={positionVariant}
      transition={transition.default}
      className={`
        relative flex gap-3 p-4 min-w-[320px] max-w-[420px] rounded-lg border backdrop-blur-md
        ${colorMap[type]}
        shadow-lg
      `}
      role="alert"
    >
      <div className="text-xl shrink-0">{iconMap[type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm mb-0.5">{title}</h4>
        {message && <p className="text-xs opacity-90">{message}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </motion.div>
  )
}

// Toast Container Component
interface ToastContainerProps {
  position?: ToastPosition
}

export function ToastContainer({ position = 'top-right' }: ToastContainerProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (event: Event) => {
      const toast = (event as CustomEvent<Toast>).detail
      setToasts((prev) => [...prev, toast])
    }

    window.addEventListener('brainsait:toast', handler as EventListener)
    return () => window.removeEventListener('brainsait:toast', handler as EventListener)
  }, [])

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const positionClass = position === 'top-right' ? 'top-4 right-4'
    : position === 'top-left' ? 'top-4 left-4'
    : position === 'bottom' ? 'bottom-4 left-1/2 -translate-x-1/2'
    : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'

  return (
    <div className={`fixed ${positionClass} z-50 flex flex-col gap-3`}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} onDismiss={handleDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Toast utility functions
let toastCounter = 0

export const toast = {
  success: (title: string, message?: string, options?: Partial<Toast>) => {
    showToast({ type: 'success', title, message, ...options })
  },
  error: (title: string, message?: string, options?: Partial<Toast>) => {
    showToast({ type: 'error', title, message, duration: 7000, ...options })
  },
  warning: (title: string, message?: string, options?: Partial<Toast>) => {
    showToast({ type: 'warning', title, message, ...options })
  },
  info: (title: string, message?: string, options?: Partial<Toast>) => {
    showToast({ type: 'info', title, message, ...options })
  },
}

function showToast(toast: Omit<Toast, 'id'>) {
  const id = `toast-${++toastCounter}-${Date.now()}`
  window.dispatchEvent(
    new CustomEvent('brainsait:toast', {
      detail: { id, ...toast },
    })
  )
}
