"use client"

import { useEffect, useMemo } from 'react'

type Locale = string | undefined

type Direction = 'ltr' | 'rtl'

const RTL_LOCALES = new Set(['ar', 'ar-SA', 'ar_EG'])

export const getDirection = (locale?: string): Direction => {
  if (!locale) {
    if (typeof document !== 'undefined') {
      return (document.documentElement.dir as Direction) || 'ltr'
    }
    return 'ltr'
  }

  const normalized = locale.toLowerCase()
  return RTL_LOCALES.has(normalized) || normalized.startsWith('ar') ? 'rtl' : 'ltr'
}

const getTypographyClass = (dir: Direction): string => {
  return dir === 'rtl' ? 'font-arabic' : 'font-sans'
}

export const useLocaleDirection = (locale?: Locale) => {
  const direction = useMemo(() => getDirection(locale), [locale])
  const isRTL = direction === 'rtl'
  const typographyClass = useMemo(() => getTypographyClass(direction), [direction])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    if (locale) {
      document.documentElement.dir = direction
    }
  }, [direction, locale])

  return {
    direction,
    isRTL,
    typographyClass,
  }
}

export const getLocaleTypographyClass = (locale?: Locale): string => {
  return getTypographyClass(getDirection(locale))
}
