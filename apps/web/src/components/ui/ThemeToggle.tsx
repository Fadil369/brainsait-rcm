'use client'

import { useMemo } from 'react'

import { useTheme } from '@/providers/ThemeProvider'

import { Button } from './Button'
import { Icon } from './Icon'

export interface ThemeToggleProps {
  locale?: string
}

const localeLabels: Record<string, { light: string; dark: string }> = {
  ar: { light: 'وضع الإضاءة', dark: 'الوضع الداكن' },
  en: { light: 'Light mode', dark: 'Dark mode' },
}

const getLabel = (locale: string | undefined, theme: 'light' | 'dark') => {
  const lang = locale?.startsWith('ar') ? 'ar' : 'en'
  return localeLabels[lang][theme]
}

export function ThemeToggle({ locale }: ThemeToggleProps) {
  const { theme, toggleTheme, isReady } = useTheme()

  const ariaLabel = useMemo(() => getLabel(locale, theme === 'dark' ? 'light' : 'dark'), [locale, theme])

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={ariaLabel}
      disabled={!isReady}
      className="rounded-full px-3 py-2"
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-5 w-5" />
      <span className="hidden sm:inline text-xs font-semibold">{getLabel(locale, theme)}</span>
    </Button>
  )
}
