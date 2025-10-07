'use client'

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import { useLocaleDirection } from '@/hooks/useLocaleDirection'
import { cn } from '@/lib/utils'

type TabsContextValue = {
  value: string
  setValue: (value: string) => void
  direction: 'ltr' | 'rtl'
  typographyClass: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  locale?: string
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  locale,
  className,
  children,
  ...props
}: TabsProps) {
  const isControlled = typeof value === 'string'
  const [internalValue, setInternalValue] = useState(defaultValue)
  const currentValue = isControlled ? (value as string) : internalValue
  const { direction, typographyClass } = useLocaleDirection(locale)

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) {
        setInternalValue(next)
      }
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  const contextValue = useMemo<TabsContextValue>(
    () => ({ value: currentValue, setValue, direction, typographyClass }),
    [currentValue, direction, setValue, typographyClass]
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        dir={direction}
        className={cn('flex flex-col gap-4', typographyClass, className)}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-white/10 bg-foreground/5 p-1 shadow-sm backdrop-blur-sm',
        className
      )}
      {...props}
    />
  )
}

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  icon?: ReactNode
}

export function TabsTrigger({ value, icon, className, children, ...props }: TabsTriggerProps) {
  const context = useContext(TabsContext)

  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs')
  }

  const isActive = context.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => context.setValue(value)}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40',
        isActive
          ? 'bg-brand-orange text-white shadow-glow'
          : 'text-muted-foreground hover:bg-foreground/10',
        className
      )}
      {...props}
    >
      {icon ? <span className="text-base" aria-hidden>{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const context = useContext(TabsContext)

  if (!context) {
    throw new Error('TabsContent must be used within Tabs')
  }

  const isActive = context.value === value

  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      className={cn('rounded-2xl border border-white/10 bg-background/5 p-6 shadow-sm transition-opacity', className)}
      {...props}
    >
      {isActive ? children : null}
    </div>
  )
}
