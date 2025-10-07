'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { designTokens, type ThemeMode } from '@/lib/design-tokens'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isReady: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_PREFIX = 'brainsait_theme'

const resolveInitialTheme = (localeKey: string, defaultTheme: Theme): Theme => {
  if (typeof window === 'undefined') {
    return defaultTheme
  }

  try {
    const stored = window.localStorage.getItem(localeKey)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch (error) {
    console.warn('Theme storage unavailable', error)
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : defaultTheme
}

const applyTokensToDocument = (mode: ThemeMode) => {
  if (typeof document === 'undefined') {
    return
  }
  const tokens = designTokens[mode]
  const root = document.documentElement

  const colorMap: Record<string, string> = {
    '--color-background': tokens.colors.background,
    '--color-foreground': tokens.colors.foreground,
    '--color-muted': tokens.colors.muted,
    '--color-muted-foreground': tokens.colors.mutedForeground,
    '--color-accent': tokens.colors.accent,
    '--color-accent-foreground': tokens.colors.accentForeground,
    '--color-secondary': tokens.colors.secondary,
    '--color-secondary-foreground': tokens.colors.secondaryForeground,
    '--color-success': tokens.colors.success,
    '--color-warning': tokens.colors.warning,
    '--color-danger': tokens.colors.danger,
    '--color-info': tokens.colors.info,
    '--surface-base': tokens.colors.surfaceBase,
    '--surface-strong': tokens.colors.surfaceStrong,
    '--surface-border': tokens.colors.surfaceBorder,
  }

  const spacingMap: Record<string, string> = {
    '--space-xs': tokens.spacing.xs,
    '--space-sm': tokens.spacing.sm,
    '--space-md': tokens.spacing.md,
    '--space-lg': tokens.spacing.lg,
    '--space-xl': tokens.spacing.xl,
    '--space-gutter': tokens.spacing.gutter,
  }

  const radiusMap: Record<string, string> = {
    '--radius-sm': tokens.radii.sm,
    '--radius-md': tokens.radii.md,
    '--radius-lg': tokens.radii.lg,
    '--radius-xl': tokens.radii.xl,
    '--radius-2xl': tokens.radii['2xl'],
  }

  const fontMap: Record<string, string> = {
    '--font-size-xs': tokens.typography.xs,
    '--font-size-sm': tokens.typography.sm,
    '--font-size-md': tokens.typography.md,
    '--font-size-lg': tokens.typography.lg,
    '--font-size-xl': tokens.typography.xl,
    '--font-size-display': tokens.typography.display,
  }

  const motionMap: Record<string, string> = {
    '--motion-duration-fast': tokens.motion.durationFast,
    '--motion-duration-default': tokens.motion.durationDefault,
    '--motion-duration-slow': tokens.motion.durationSlow,
    '--motion-ease': tokens.motion.ease,
  }

  const shadowMap: Record<string, string> = {
    '--shadow-glow': tokens.shadows.glow,
    '--shadow-neon': tokens.shadows.neon,
    '--shadow-ambient': tokens.shadows.ambient,
    '--shadow-focus': tokens.shadows.focus,
  }

  const setVars = (map: Record<string, string>) => {
    Object.entries(map).forEach(([variable, value]) => {
      root.style.setProperty(variable, value)
    })
  }

  setVars(colorMap)
  setVars(spacingMap)
  setVars(radiusMap)
  setVars(fontMap)
  setVars(motionMap)
  setVars(shadowMap)
}

const applyThemeToDocument = (theme: Theme) => {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  applyTokensToDocument(theme)
}

export interface ThemeProviderProps {
  locale?: string
  defaultTheme?: Theme
  children: React.ReactNode
}

export function ThemeProvider({ locale = 'en', defaultTheme = 'dark', children }: ThemeProviderProps) {
  const storageKey = `${THEME_STORAGE_PREFIX}_${locale}`
  const [theme, setThemeState] = useState<Theme>(() => defaultTheme)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initialTheme = resolveInitialTheme(storageKey, defaultTheme)
    setThemeState(initialTheme)
    applyThemeToDocument(initialTheme)
    setIsReady(true)
  }, [defaultTheme, storageKey])

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme)
      applyThemeToDocument(nextTheme)
      try {
        window.localStorage.setItem(storageKey, nextTheme)
      } catch (error) {
        console.warn('Theme storage unavailable', error)
      }
    },
    [storageKey]
  )

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const nextTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark'
      applyThemeToDocument(nextTheme)
      try {
        window.localStorage.setItem(storageKey, nextTheme)
      } catch (error) {
        console.warn('Theme storage unavailable', error)
      }
      return nextTheme
    })
  }, [storageKey])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme, isReady }),
    [theme, setTheme, toggleTheme, isReady]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
