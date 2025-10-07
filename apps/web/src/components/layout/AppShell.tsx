'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useDashboardContext } from '@/providers/DashboardDataProvider'
import { useTheme } from '@/providers/ThemeProvider'

const NAV_ITEMS = [
  { href: '/', label: { en: 'Dashboard', ar: 'لوحة التحكم' } },
  { href: '/claims', label: { en: 'Claims', ar: 'المطالبات' } },
  { href: '/compliance', label: { en: 'Compliance', ar: 'الامتثال' } },
  { href: '/insights', label: { en: 'Insights', ar: 'الرؤى' } },
  { href: '/audit', label: { en: 'Audit', ar: 'التدقيق' } },
]

const QUICK_LINKS = [
  { label: 'Realtime Hub', href: '/live' },
  { label: 'AI Agent', href: '/assistant' },
  { label: 'Academy', href: '/academy' },
]

type MetricDatum = {
  id: string
  label: string
  labelAr?: string
  value: string
  valueNumeric?: number
  delta?: string
  tone?: 'positive' | 'negative' | 'neutral'
}

const formatMetricNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

const buildDefaultMetrics = (): MetricDatum[] => [
  {
    id: 'claims',
    label: 'Claims Processed',
    labelAr: 'المطالبات المعالجة',
    value: formatMetricNumber(4823),
    valueNumeric: 4823,
    delta: '+18.2% vs. last week',
    tone: 'positive',
  },
  {
    id: 'recovery',
    label: 'Recovery Rate',
    labelAr: 'معدل الاسترداد',
    value: '94.6%',
    valueNumeric: 94.6,
    delta: '+2.1 pts',
    tone: 'positive',
  },
  {
    id: 'fraud',
    label: 'Fraud Alerts',
    labelAr: 'تنبيهات الاحتيال',
    value: formatMetricNumber(12),
    valueNumeric: 12,
    delta: '2 critical',
    tone: 'negative',
  },
  {
    id: 'uptime',
    label: 'Platform Uptime',
    labelAr: 'جاهزية المنصة',
    value: '99.984%',
    valueNumeric: 99.984,
    delta: 'SLA ▲',
    tone: 'neutral',
  },
]

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

type Locale = 'en' | 'ar'

const LOCALE_STORAGE_KEY = 'brainsait_locale'

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface-strong/60 text-sm text-foreground transition hover:border-accent hover:text-accent"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

interface LocaleSwitcherProps {
  locale: Locale
  setLocale: (next: Locale) => void
}

function LocaleSwitcher({ locale, setLocale }: LocaleSwitcherProps) {
  const handleChange = useCallback(
    (next: Locale) => {
      setLocale(next)
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
        window.dispatchEvent(new CustomEvent('brainsait:locale-change', { detail: next }))
      } catch (error) {
        console.warn('Failed to persist locale', error)
      }
      document.documentElement.lang = next
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
    },
    [setLocale]
  )

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-full border border-white/10 bg-surface-base/60 p-0.5 text-xs font-semibold">
      {(['en', 'ar'] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => handleChange(code)}
          className={classNames(
            'rounded-full px-3 py-1 transition-colors',
            locale === code
              ? 'bg-accent text-accent-foreground shadow-glow'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function AccountSwitcher() {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((prev) => !prev)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-strong/70 px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm text-accent-foreground">
          BA
        </span>
        <span className="hidden sm:inline-flex flex-col text-left text-xs uppercase tracking-wide text-muted-foreground">
          <span className="text-foreground text-sm font-semibold leading-tight">BrainSAIT Arabia</span>
          <span>Switch account</span>
        </span>
      </button>
      {open ? (
        <ul className="absolute right-0 mt-3 w-64 rounded-xl border border-white/10 bg-surface-base/95 p-2 text-sm shadow-ambient backdrop-blur-xl">
          {['BrainSAIT Arabia', 'BrainSAIT GCC', 'BrainSAIT Test Lab'].map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
              >
                <span>{name}</span>
                <span className="text-xs uppercase text-muted-foreground">Primary</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

interface MetricRibbonProps {
  locale: Locale
}

function MetricRibbon({ locale }: MetricRibbonProps) {
  const { data, loading } = useDashboardContext()
  const summary = data?.analytics?.metrics

  const metrics = useMemo<MetricDatum[]>(() => {
    const alerts = data?.analytics?.recent_alerts ?? []
    if (!summary) {
      return buildDefaultMetrics()
    }

    const numberFormatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    })
    const percentFormatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'percent',
      maximumFractionDigits: 1,
    })

    const totalClaims = summary.total_claims ?? 0
    const rejectionRate = summary.rejection_rate ?? 0
    const recoveryRate = summary.recovery_rate ?? 0
    const complianceWithin30 = summary.within_30_days_compliance ?? summary.compliance_within_30 ?? 0
    const overdueLetters = summary.overdue_letters ?? 0
    const totalAlerts = alerts.length
    const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical').length

    return [
      {
        id: 'claims',
        label: 'Claims Processed',
        labelAr: 'المطالبات المعالجة',
        value: numberFormatter.format(totalClaims),
        valueNumeric: totalClaims,
        delta:
          rejectionRate > 0
            ? `${locale === 'ar' ? 'معدل الرفض' : 'Rejection rate'} ${percentFormatter.format(
                rejectionRate / 100
              )}`
            : undefined,
        tone: rejectionRate <= 10 ? 'positive' : rejectionRate >= 20 ? 'negative' : 'neutral',
      },
      {
        id: 'recovery',
        label: 'Recovery Rate',
        labelAr: 'معدل الاسترداد',
        value: percentFormatter.format(recoveryRate / 100),
        valueNumeric: recoveryRate,
        delta:
          summary.total_billed !== undefined
            ? `${locale === 'ar' ? 'إجمالي الفواتير' : 'Total billed'} ${numberFormatter.format(
                summary.total_billed
              )}`
            : undefined,
        tone: recoveryRate >= 90 ? 'positive' : recoveryRate <= 70 ? 'negative' : 'neutral',
      },
      {
        id: 'alerts',
        label: 'Fraud Alerts',
        labelAr: 'تنبيهات الاحتيال',
        value: numberFormatter.format(totalAlerts),
        valueNumeric: totalAlerts,
        delta:
          totalAlerts > 0
            ? `${locale === 'ar' ? 'تنبيهات حرجة' : 'Critical'} ${criticalAlerts}`
            : locale === 'ar'
            ? 'لا تنبيهات'
            : 'No alerts',
        tone: totalAlerts === 0 ? 'positive' : criticalAlerts > 0 ? 'negative' : 'neutral',
      },
      {
        id: 'compliance',
        label: '30-Day Compliance',
        labelAr: 'التوافق خلال ٣٠ يوماً',
        value: percentFormatter.format(complianceWithin30 / 100),
        valueNumeric: complianceWithin30,
        delta:
          overdueLetters > 0
            ? `${locale === 'ar' ? 'خطابات متأخرة' : 'Overdue letters'} ${overdueLetters}`
            : locale === 'ar'
            ? 'جميع الخطابات ضمن SLA'
            : 'All letters within SLA',
        tone: overdueLetters > 0 ? 'negative' : 'positive',
      },
    ]
  }, [data?.analytics?.recent_alerts, locale, summary])

  if (loading && !summary) {
    return (
      <div className="sticky top-[68px] z-40 border-b border-white/5 bg-surface-base/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`metric-skeleton-${index}`}
              className="min-w-[200px] animate-pulse rounded-2xl border border-white/10 bg-surface-strong/40 px-4 py-3"
            >
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="mt-3 h-5 w-32 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="sticky top-[68px] z-40 border-b border-white/5 bg-surface-base/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="min-w-[200px] rounded-2xl border border-white/10 bg-surface-strong/70 px-4 py-3 text-sm shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {locale === 'ar' ? metric.labelAr ?? metric.label : metric.label}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-semibold text-foreground">{metric.value}</span>
              {metric.delta ? (
                <span
                  className={classNames(
                    'text-xs font-medium',
                    metric.tone === 'positive' && 'text-success',
                    metric.tone === 'negative' && 'text-danger',
                    metric.tone === 'neutral' && 'text-muted-foreground'
                  )}
                >
                  {metric.delta}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileMenu({
  locale,
  setLocale,
  onClose,
}: {
  locale: Locale
  setLocale: (next: Locale) => void
  onClose: () => void
}) {
  const pathname = usePathname()
  return (
    <div className="lg:hidden">
      <div className="border-t border-white/10 bg-surface-base/95 px-4 py-4 shadow-ambient backdrop-blur-xl">
        <nav className="flex flex-col gap-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={classNames(
                'rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-white/5',
                pathname === item.href ? 'bg-white/5 text-foreground' : 'text-muted-foreground'
              )}
            >
              {locale === 'ar' ? item.label.ar : item.label.en}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between">
          <LocaleSwitcher locale={locale} setLocale={setLocale} />
          <ThemeToggleButton />
        </div>
      </div>
    </div>
  )
}

export interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [locale, setLocale] = useState<Locale>('en')
  const handleLocale = useCallback((next: Locale) => setLocale(next), [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    const initial = stored === 'ar' || stored === 'en' ? stored : 'en'
    setLocale(initial)
    document.documentElement.lang = initial
    document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr'
    window.dispatchEvent(new CustomEvent('brainsait:locale-change', { detail: initial }))
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [mobileOpen])

  const toggleMobile = useCallback(() => setMobileOpen((prev) => !prev), [])

  return (
    <Fragment>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-surface-base/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMobile}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-transparent text-lg lg:hidden"
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
              >
                ☰
              </button>
              <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm text-accent-foreground shadow-glow">
                  B
                </span>
                <span className="hidden sm:inline">BrainSAIT Platform</span>
              </Link>
              <nav className="hidden items-center gap-2 lg:flex">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={classNames(
                        'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-white/10 text-foreground shadow-glow'
                          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      )}
                    >
                      {locale === 'ar' ? item.label.ar : item.label.en}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="hidden items-center gap-4 lg:flex">
              <LocaleSwitcher locale={locale} setLocale={handleLocale} />
              <AccountSwitcher />
              <ThemeToggleButton />
            </div>
            <div className="flex items-center gap-3 lg:hidden">
              <AccountSwitcher />
            </div>
          </div>
          <div className="hidden border-t border-white/5 lg:block">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground sm:px-6 lg:px-8">
              <span>Quick access</span>
              <div className="flex items-center gap-4">
                {QUICK_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="transition hover:text-foreground">
                    {link.label}
                  </Link>
                ))}
              </div>
              <span className="text-muted-foreground">Theme: {theme}</span>
            </div>
          </div>
        </header>
        <MetricRibbon locale={locale} />
        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      {mobileOpen ? (
  <MobileMenu locale={locale} setLocale={handleLocale} onClose={() => setMobileOpen(false)} />
      ) : null}
    </Fragment>
  )
}
