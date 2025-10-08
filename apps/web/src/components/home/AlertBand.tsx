'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { entrance, transition } from '@/lib/animation-primitives'
import { cn } from '@/utils/cn'

export type AlertType = 'critical' | 'warning' | 'info' | 'success'

export interface AlertItem {
  id: string
  type: AlertType
  title: string
  titleAr?: string
  message: string
  messageAr?: string
  timestamp?: Date
  action?: {
    label: string
    labelAr?: string
    href?: string
    onClick?: () => void
  }
}

interface AlertBandProps {
  alerts: AlertItem[]
  locale?: 'en' | 'ar'
  autoRotate?: boolean
  rotationInterval?: number
  dismissible?: boolean
  onDismiss?: (id: string) => void
}

const alertConfig: Record<AlertType, { icon: string; bgClass: string; borderClass: string; textClass: string }> = {
  critical: {
    icon: '🔴',
    bgClass: 'bg-danger/10',
    borderClass: 'border-danger/30',
    textClass: 'text-danger',
  },
  warning: {
    icon: '🟡',
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning/30',
    textClass: 'text-warning',
  },
  info: {
    icon: '🔵',
    bgClass: 'bg-info/10',
    borderClass: 'border-info/30',
    textClass: 'text-info',
  },
  success: {
    icon: '🟢',
    bgClass: 'bg-success/10',
    borderClass: 'border-success/30',
    textClass: 'text-success',
  },
}

export function AlertBand({
  alerts,
  locale = 'en',
  autoRotate = true,
  rotationInterval = 8000,
  dismissible = true,
  onDismiss,
}: AlertBandProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visibleAlerts, setVisibleAlerts] = useState(alerts)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load dismissed alerts from localStorage
    const stored = localStorage.getItem('brainsait_dismissed_alerts')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setDismissed(new Set(parsed))
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  useEffect(() => {
    const filtered = alerts.filter((alert) => !dismissed.has(alert.id))
    setVisibleAlerts(filtered)
    if (currentIndex >= filtered.length && filtered.length > 0) {
      setCurrentIndex(0)
    }
  }, [alerts, dismissed, currentIndex])

  useEffect(() => {
    if (!autoRotate || visibleAlerts.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleAlerts.length)
    }, rotationInterval)

    return () => clearInterval(timer)
  }, [autoRotate, rotationInterval, visibleAlerts.length])

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissed).add(id)
    setDismissed(newDismissed)
    localStorage.setItem('brainsait_dismissed_alerts', JSON.stringify([...newDismissed]))
    onDismiss?.(id)
  }

  if (visibleAlerts.length === 0) return null

  const currentAlert = visibleAlerts[currentIndex]
  if (!currentAlert) return null

  const config = alertConfig[currentAlert.type]
  const displayTitle = locale === 'ar' && currentAlert.titleAr ? currentAlert.titleAr : currentAlert.title
  const displayMessage = locale === 'ar' && currentAlert.messageAr ? currentAlert.messageAr : currentAlert.message
  const displayActionLabel = locale === 'ar' && currentAlert.action?.labelAr
    ? currentAlert.action.labelAr
    : currentAlert.action?.label

  return (
    <div className="sticky top-16 z-40 w-full">
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAlert.id}
            {...entrance.slideDown}
            transition={transition.default}
            className={cn(
              'w-full border-b backdrop-blur-md',
              config.bgClass,
              config.borderClass
            )}
          >
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xl shrink-0">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn('font-semibold text-sm', config.textClass)}>
                      {displayTitle}
                    </h4>
                    <p className="text-xs text-foreground/80 truncate">
                      {displayMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {currentAlert.action && (
                    <button
                      onClick={currentAlert.action.onClick}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md',
                        'bg-foreground/10 hover:bg-foreground/20',
                        'transition-colors duration-150'
                      )}
                    >
                      {displayActionLabel}
                    </button>
                  )}

                  {visibleAlerts.length > 1 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <button
                        onClick={() => setCurrentIndex((prev) => (prev - 1 + visibleAlerts.length) % visibleAlerts.length)}
                        className="p-1 hover:text-foreground transition-colors"
                        aria-label="Previous alert"
                      >
                        ←
                      </button>
                      <span>
                        {currentIndex + 1} / {visibleAlerts.length}
                      </span>
                      <button
                        onClick={() => setCurrentIndex((prev) => (prev + 1) % visibleAlerts.length)}
                        className="p-1 hover:text-foreground transition-colors"
                        aria-label="Next alert"
                      >
                        →
                      </button>
                    </div>
                  )}

                  {dismissible && (
                    <button
                      onClick={() => handleDismiss(currentAlert.id)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Dismiss alert"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
