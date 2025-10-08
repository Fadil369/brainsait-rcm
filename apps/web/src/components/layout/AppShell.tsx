'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Fragment, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth/context'
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

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'connect-data',
    title: {
      en: 'Connect your data sources',
      ar: 'ربط مصادر البيانات',
    },
    description: {
      en: 'Link core payers and hospital feeds so claims and remittances sync automatically.',
      ar: 'قم بربط شركات التأمين وقنوات المستشفى لتتم مزامنة المطالبات والتحصيلات تلقائياً.',
    },
    helper: {
      en: 'We recommend starting with NPHIES or the primary payer you reconcile with weekly.',
      ar: 'ننصح بالبدء بمنصة نفيس أو شركة التأمين الرئيسية التي تسوي معها أسبوعياً.',
    },
    cta: {
      en: 'Open integrations',
      ar: 'فتح التكاملات',
    },
    href: '/integrations',
  },
  {
    id: 'configure-channels',
    title: {
      en: 'Set up stakeholder channels',
      ar: 'إعداد قنوات أصحاب المصلحة',
    },
    description: {
      en: 'Enable proactive alerts for finance, clinical reviewers, and partner hospitals.',
      ar: 'فعّل التنبيهات الاستباقية للمالية والمراجعين الإكلينيكيين والمستشفيات الشريكة.',
    },
    helper: {
      en: 'Connect Microsoft Teams or WhatsApp to broadcast rejections instantly.',
      ar: 'قم بتوصيل Microsoft Teams أو واتساب لإرسال مرفوضات المطالبات فوراً.',
    },
    cta: {
      en: 'Configure channels',
      ar: 'تهيئة القنوات',
    },
    href: '/stakeholders',
  },
  {
    id: 'invite-team',
    title: {
      en: 'Invite your operations team',
      ar: 'دعوة فريق العمليات',
    },
    description: {
      en: 'Bring claim processors, audit leads, and analytics partners into BrainSAIT.',
      ar: 'أضف مسؤولي معالجة المطالبات وقادة التدقيق وشركاء التحليلات إلى منصة BrainSAIT.',
    },
    helper: {
      en: 'Assign roles so everyone receives the right dashboards and notifications.',
      ar: 'حدد الأدوار لضمان حصول الجميع على اللوحات والتنبيهات المناسبة.',
    },
    cta: {
      en: 'Invite collaborators',
      ar: 'دعوة المتعاونين',
    },
    href: '/settings/team',
  },
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
const ONBOARDING_PROGRESS_KEY = 'brainsait_onboarding_progress'

const FOCUSABLE_ELEMENTS_SELECTOR =
  'a[href]:not([tabindex="-1"]), button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

type OnboardingStep = {
  id: string
  title: { en: string; ar: string }
  description: { en: string; ar: string }
  href?: string
  cta: { en: string; ar: string }
  helper?: { en: string; ar: string }
}

type OnboardingCompletionOptions = {
  shouldNavigate?: boolean
  closeOverlay?: boolean
}

function useFocusTrap(active: boolean, ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!active) {
      return undefined
    }

    const container = ref.current
    if (!container) {
      return undefined
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR)
    ).filter((element) => !element.hasAttribute('data-focus-trap-ignore'))

    const firstFocusable = focusableElements[0] ?? container
    const lastFocusable = focusableElements[focusableElements.length - 1] ?? container

    const focusFirstElement = () => {
      window.setTimeout(() => {
        if (document.activeElement === firstFocusable) {
          return
        }
        if (firstFocusable) {
          firstFocusable.focus()
        } else {
          container.focus()
        }
      }, 0)
    }

    focusFirstElement()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return
      }

      if (!focusableElements.length) {
        event.preventDefault()
        container.focus()
        return
      }

      const isShift = event.shiftKey
      const current = document.activeElement as HTMLElement | null

      if (!isShift && current === lastFocusable) {
        event.preventDefault()
        firstFocusable.focus()
      } else if (isShift && current === firstFocusable) {
        event.preventDefault()
        lastFocusable.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [active, ref])
}

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

interface MobileMenuProps {
  locale: Locale
  setLocale: (next: Locale) => void
  onClose: () => void
  onStartOnboarding: () => void
  onboardingProgressLabel: string
}

const MobileMenu = forwardRef<HTMLDivElement, MobileMenuProps>(function MobileMenu(
  { locale, setLocale, onClose, onStartOnboarding, onboardingProgressLabel },
  ref
) {
  const pathname = usePathname()

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/50 backdrop-blur-sm lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={locale === 'ar' ? 'قائمة التنقل للجوال' : 'Mobile navigation'}
    >
      <div aria-hidden="true" className="absolute inset-0" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className="relative mt-auto border-t border-white/10 bg-surface-base/95 px-4 py-4 shadow-ambient backdrop-blur-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {locale === 'ar' ? 'قائمة سريعة' : 'Quick menu'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-base text-muted-foreground transition hover:border-accent hover:text-foreground"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">{locale === 'ar' ? 'إغلاق القائمة' : 'Close menu'}</span>
          </button>
        </div>
        <nav className="flex flex-col gap-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={classNames(
                'rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                pathname === item.href ? 'bg-white/5 text-foreground' : 'text-muted-foreground'
              )}
            >
              {locale === 'ar' ? item.label.ar : item.label.en}
            </Link>
          ))}
        </nav>
        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={onStartOnboarding}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-accent/10 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent/20"
          >
            <span>🚀</span>
            <span>{onboardingProgressLabel}</span>
          </button>
          <div className="flex items-center justify-between">
            <LocaleSwitcher locale={locale} setLocale={setLocale} />
            <ThemeToggleButton />
          </div>
        </div>
      </div>
    </div>
  )
})

interface OnboardingJourneyProps {
  locale: Locale
  onClose: () => void
  steps: OnboardingStep[]
  completed: Record<string, boolean>
  onCompleteStep: (step: OnboardingStep, options?: OnboardingCompletionOptions) => void
}

const OnboardingJourney = forwardRef<HTMLDivElement, OnboardingJourneyProps>(function OnboardingJourney(
  { locale, onClose, steps, completed, onCompleteStep },
  ref
) {
  const completedCount = steps.filter((step) => completed[step.id]).length
  const totalSteps = steps.length
  const progressLabel = `${completedCount}/${totalSteps}`

  const heading = locale === 'ar' ? 'ابدأ خلال ثلاث خطوات' : 'Get started in three steps'
  const closeLabel = locale === 'ar' ? 'إغلاق' : 'Close'
  const finishLabel = completedCount === totalSteps
    ? locale === 'ar'
      ? 'جاهز للانطلاق'
      : 'You are ready!'
    : locale === 'ar'
      ? 'متابعة لاحقاً'
      : 'Continue later'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <div aria-hidden="true" className="absolute inset-0" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-surface-base/95 p-6 text-sm shadow-ambient backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {locale === 'ar'
                ? 'أكمل الخطوات الثلاث الرئيسية لتفعيل رحلات المطالبات والتحليلات.'
                : 'Complete three key steps to activate claims workflows and analytics.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-base text-muted-foreground transition hover:border-accent hover:text-foreground"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">{closeLabel}</span>
          </button>
        </div>
        <div className="mt-5 space-y-4">
          {steps.map((step, index) => {
            const isCompleted = Boolean(completed[step.id])
            return (
              <div
                key={step.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-accent/40"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={classNames(
                      'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold',
                      isCompleted
                        ? 'bg-success/20 text-success'
                        : 'bg-accent/15 text-accent'
                    )}
                  >
                    {isCompleted ? '✓' : index + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {locale === 'ar' ? step.title.ar : step.title.en}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {locale === 'ar' ? step.description.ar : step.description.en}
                      </p>
                      {step.helper ? (
                        <p className="mt-2 text-xs text-muted-foreground/80">
                          {locale === 'ar' ? step.helper.ar : step.helper.en}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCompleteStep(step)}
                        className={classNames(
                          'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                          isCompleted
                            ? 'border border-success/40 bg-success/15 text-success'
                            : 'border border-white/10 bg-accent/10 text-foreground hover:border-accent hover:bg-accent/20'
                        )}
                        disabled={isCompleted}
                      >
                        {isCompleted
                          ? locale === 'ar'
                            ? 'أُنجزت'
                            : 'Completed'
                          : locale === 'ar'
                          ? step.cta.ar
                          : step.cta.en}
                      </button>
                      {step.href ? (
                        <Link
                          href={step.href}
                          className="text-xs font-medium text-accent transition hover:text-accent/80"
                          onClick={(event) => {
                            event.preventDefault()
                            onCompleteStep(step, { shouldNavigate: true, closeOverlay: true })
                          }}
                        >
                          {locale === 'ar' ? 'عرض التفاصيل' : 'View details'}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {locale === 'ar'
              ? `التقدم: ${progressLabel}`
              : `Progress: ${progressLabel}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-medium text-foreground transition hover:border-accent hover:text-accent"
          >
            <span aria-hidden="true">↩</span>
            <span>{finishLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
})

export interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { theme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [locale, setLocale] = useState<Locale>('en')
  const handleLocale = useCallback((next: Locale) => setLocale(next), [])
  const [onboardingCompleted, setOnboardingCompleted] = useState<Record<string, boolean>>({})
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const onboardingRef = useRef<HTMLDivElement | null>(null)
  const onboardingLoadedRef = useRef(false)
  const previousPathnameRef = useRef(pathname)

  const onboardingStorageKey = useMemo(() => {
    if (!user) {
      return null
    }
    const rawAccountId = user?.['account_id']
    const accountId = typeof rawAccountId === 'string' ? rawAccountId : undefined
    const userId = typeof user.id === 'string' ? user.id : undefined
    const userEmail = typeof user.email === 'string' ? user.email : undefined
    const identifier = accountId ?? userId ?? userEmail
    if (!identifier) {
      return null
    }
    return `${ONBOARDING_PROGRESS_KEY}:${identifier}`
  }, [user])

  useFocusTrap(mobileOpen, mobileMenuRef)
  useFocusTrap(onboardingOpen, onboardingRef)

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
    onboardingLoadedRef.current = false
    if (typeof window === 'undefined') return
    if (onboardingStorageKey) {
      try {
        window.localStorage.removeItem(ONBOARDING_PROGRESS_KEY)
      } catch (error) {
        console.warn('Failed to remove legacy onboarding progress key', error)
      }
    }
    if (!onboardingStorageKey) {
      setOnboardingCompleted({})
      return
    }
    try {
      const stored = window.localStorage.getItem(onboardingStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>
        setOnboardingCompleted(parsed)
      } else {
        setOnboardingCompleted({})
      }
    } catch (error) {
      console.warn('Failed to load onboarding progress', error)
      setOnboardingCompleted({})
    } finally {
      onboardingLoadedRef.current = true
    }
  }, [onboardingStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!onboardingStorageKey || !onboardingLoadedRef.current) return
    try {
      window.localStorage.setItem(onboardingStorageKey, JSON.stringify(onboardingCompleted))
    } catch (error) {
      console.warn('Failed to persist onboarding progress', error)
    }
  }, [onboardingCompleted, onboardingStorageKey])

  useEffect(() => {
    if (!mobileOpen && !onboardingOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (onboardingOpen) {
        setOnboardingOpen(false)
      } else if (mobileOpen) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [mobileOpen, onboardingOpen])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const shouldLockScroll = mobileOpen || onboardingOpen
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = shouldLockScroll ? 'hidden' : ''
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileOpen, onboardingOpen])

  useEffect(() => {
    if (previousPathnameRef.current !== pathname && onboardingOpen) {
      setOnboardingOpen(false)
    }
    previousPathnameRef.current = pathname
  }, [pathname, onboardingOpen])

  const toggleMobile = useCallback(() => setMobileOpen((prev) => !prev), [])

  const completedOnboardingSteps = useMemo(() => {
    return ONBOARDING_STEPS.reduce(
      (count, step) => (onboardingCompleted[step.id] ? count + 1 : count),
      0
    )
  }, [onboardingCompleted])

  const onboardingProgressLabel = useMemo(() => {
    const total = ONBOARDING_STEPS.length
    if (completedOnboardingSteps === 0) {
      return locale === 'ar' ? 'بدء الإعداد السريع' : 'Start onboarding'
    }
    if (completedOnboardingSteps >= total) {
      return locale === 'ar' ? 'الرحلة مكتملة' : 'Onboarding complete'
    }
    return locale === 'ar'
      ? `التقدم ${completedOnboardingSteps}/${total}`
      : `Onboarding ${completedOnboardingSteps}/${total}`
  }, [completedOnboardingSteps, locale])

  const handleStartOnboarding = useCallback(() => {
    setOnboardingOpen(true)
    setMobileOpen(false)
  }, [])

  const handleCompleteOnboardingStep = useCallback(
    (step: OnboardingStep, options?: OnboardingCompletionOptions) => {
      const shouldNavigate = options?.shouldNavigate ?? Boolean(step.href)
      const closeOverlay = options?.closeOverlay ?? true

      setOnboardingCompleted((previous) => {
        if (previous[step.id]) {
          return previous
        }
        return { ...previous, [step.id]: true }
      })

      if (closeOverlay) {
        setOnboardingOpen(false)
      }

      if (shouldNavigate && step.href) {
        router.push(step.href)
      }
    },
    [router]
  )

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
        <MobileMenu
          ref={mobileMenuRef}
          locale={locale}
          setLocale={handleLocale}
          onClose={() => setMobileOpen(false)}
          onStartOnboarding={handleStartOnboarding}
          onboardingProgressLabel={onboardingProgressLabel}
        />
      ) : null}
      {onboardingOpen ? (
        <OnboardingJourney
          ref={onboardingRef}
          locale={locale}
          onClose={() => setOnboardingOpen(false)}
          steps={ONBOARDING_STEPS}
          completed={onboardingCompleted}
          onCompleteStep={handleCompleteOnboardingStep}
        />
      ) : null}
    </Fragment>
  )
}
