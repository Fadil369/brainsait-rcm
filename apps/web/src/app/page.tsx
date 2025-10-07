'use client'

import type { Locale, UserRole } from '@brainsait/rejection-tracker'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { RejectionDashboard } from '@/components/RejectionDashboard'
import { useAuth } from '@/lib/hooks'
import { useDashboardContext } from '@/providers/DashboardDataProvider'
import type {
  DashboardAnalytics,
  DashboardFraudAlert,
  DashboardMetricSeriesPoint,
} from '@/types/api'
import {
  buildSparklineGeometry,
  filterSeriesByRange,
  normalizeChartSeries,
  normalizeSeriesKey,
} from '@/utils/dashboardSeries'


export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { data: dashboardData, loading: dashboardLoading } = useDashboardContext()
  const [locale, setLocale] = useState<Locale>('en')
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('brainsait_locale')
    if (stored === 'ar' || stored === 'en') {
      setLocale(stored)
    }
    setInitialised(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handler = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail
      if (next === 'en' || next === 'ar') {
        setLocale(next)
      }
    }
    window.addEventListener('brainsait:locale-change', handler as EventListener)
    return () => window.removeEventListener('brainsait:locale-change', handler as EventListener)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  const handleLocaleChange = (value: Locale) => {
    setLocale(value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('brainsait_locale', value)
      window.dispatchEvent(new CustomEvent('brainsait:locale-change', { detail: value }))
      document.documentElement.lang = value
      document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr'
    }
  }

  if (loading || dashboardLoading || !initialised) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="text-white text-2xl font-semibold">Loading BrainSAIT dashboard...</div>
          <div className="w-64 h-1.5 bg-white/10 overflow-hidden rounded-full">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
              className="w-1/3 h-full bg-gradient-to-r from-brainsait-cyan to-brainsait-blue"
            />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const role = (user.role as UserRole) ?? 'ADMIN'
  const rawName = user.full_name ?? user.username ?? user.email ?? 'BrainSAIT'
  const displayName = typeof rawName === 'string' ? rawName : 'BrainSAIT'
  const analytics = dashboardData?.analytics ?? null

  return (
    <>
      <DashboardHero displayName={displayName} locale={locale} analytics={analytics ?? undefined} />
      <AlertBand alerts={analytics?.recent_alerts ?? []} locale={locale} />
      <section className="mt-10">
        <RejectionDashboard
          userRole={role}
          locale={locale}
          userName={displayName}
          onLocaleChange={handleLocaleChange}
        />
      </section>
    </>
  )
}

interface DashboardHeroProps {
  displayName: string
  locale: Locale
  analytics?: DashboardAnalytics | null
}

type MetricRange = '7d' | '30d' | '90d'

function DashboardHero({ displayName, locale, analytics }: DashboardHeroProps) {
  const [range, setRange] = useState<MetricRange>('7d')

  const metrics = analytics?.metrics ?? null
  const updatedAt = analytics?.updated_at ?? (analytics as { updatedAt?: string | null })?.updatedAt ?? null
  const chartSeriesInput = analytics?.chart_series ?? analytics?.chartSeries ?? null
  const chartSeriesMap = useMemo(() => normalizeChartSeries(chartSeriesInput), [chartSeriesInput])
  const alertsCount = Array.isArray(analytics?.recent_alerts) ? analytics.recent_alerts.length : undefined

  type HeroMetric = {
    id: string
    label: string
    value: number | undefined
    suffix: string
    display: string
    target: number
    series?: DashboardMetricSeriesPoint[]
    tone: 'positive' | 'negative' | 'neutral'
  }

  const kpis = useMemo<HeroMetric[]>(() => {
    const getSeries = (keys: string[]) => {
      for (const key of keys) {
        const normalizedKey = normalizeSeriesKey(key)
        const series = chartSeriesMap[normalizedKey]
        if (series && series.length > 0) {
          return series
        }
      }
      return undefined
    }

    const numberFormatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    })
    const percentFormatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'percent',
      maximumFractionDigits: 1,
    })

    const complianceValue =
      typeof metrics?.compliance_within_30 === 'number'
        ? metrics.compliance_within_30
        : typeof metrics?.within_30_days_compliance === 'number'
        ? metrics.within_30_days_compliance
        : undefined
    const recoveryValue = typeof metrics?.recovery_rate === 'number' ? metrics.recovery_rate : undefined
    const totalClaims = typeof metrics?.total_claims === 'number' ? metrics.total_claims : undefined
    const totalAlerts = typeof alertsCount === 'number' ? alertsCount : undefined

    const definitions: Array<Omit<HeroMetric, 'display'>> = [
      {
        id: 'claims',
        label: locale === 'ar' ? 'المطالبات المعالجة' : 'Claims Processed',
        value: totalClaims,
        suffix: locale === 'ar' ? 'مطالبة' : 'claims',
        target: 5000,
        series: getSeries(['claims', 'total_claims', 'totalClaims']),
        tone: 'positive',
      },
      {
        id: 'recovery',
        label: locale === 'ar' ? 'معدل الاسترداد' : 'Recovery Rate',
        value: recoveryValue,
        suffix: '',
        target: 100,
        series: getSeries(['recovery', 'recovery_rate', 'recoveryRate']),
        tone:
          typeof recoveryValue === 'number'
            ? recoveryValue >= 90
              ? 'positive'
              : recoveryValue <= 70
              ? 'negative'
              : 'neutral'
            : 'neutral',
      },
      {
        id: 'alerts',
        label: locale === 'ar' ? 'تنبيهات الاحتيال' : 'Fraud Alerts',
        value: totalAlerts,
        suffix: locale === 'ar' ? 'تنبيه' : 'alerts',
        target: 20,
        series: getSeries(['alerts', 'fraud_alerts', 'recent_alerts', 'fraud']),
        tone:
          typeof totalAlerts === 'number'
            ? totalAlerts === 0
              ? 'positive'
              : totalAlerts > 5
              ? 'negative'
              : 'neutral'
            : 'neutral',
      },
      {
        id: 'compliance',
        label: locale === 'ar' ? 'التوافق خلال 30 يوماً' : '30-Day Compliance',
        value: complianceValue,
        suffix: '',
        target: 100,
        series: getSeries(['compliance', 'within_30_days_compliance', 'compliance_within_30']),
        tone:
          typeof complianceValue === 'number'
            ? complianceValue >= 90
              ? 'positive'
              : complianceValue <= 75
              ? 'negative'
              : 'neutral'
            : 'neutral',
      },
    ]

    return definitions.map((item) => {
      let display = '--'
      if (typeof item.value === 'number') {
        if (item.id === 'recovery' || item.id === 'compliance') {
          display = percentFormatter.format(item.value / 100)
        } else {
          display = numberFormatter.format(item.value)
        }
      }
      return { ...item, display }
    })
  }, [alertsCount, chartSeriesMap, locale, metrics])

  const progressForMetric = (metric: HeroMetric): number => {
    if (typeof metric.value !== 'number' || metric.target <= 0) {
      return 0.2
    }
    const ratio = Math.min(Math.max(metric.value / metric.target, 0), 1)
    if (metric.tone === 'negative') {
      return Math.max(0.1, 1 - ratio)
    }
    return ratio
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-surface-base/80 px-6 py-10 shadow-ambient backdrop-blur-xl md:px-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
            {locale === 'ar' ? 'منصة BrainSAIT' : 'BrainSAIT Command'}
            <span className="h-2 w-2 rounded-full bg-success shadow-glow" />
          </span>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
            {locale === 'ar'
              ? `أهلاً ${displayName}, نحن نراقب رحلتك التشغيلية.`
              : `Welcome back ${displayName}, we are orchestrating your operational journey.`}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {locale === 'ar'
              ? 'تتبع المطالبات، التحذيرات، والأداء في الوقت الحقيقي مع دعم كامل للغة العربية.'
              : 'Track claims, compliance alerts, and fraud intelligence in real time with bilingual guidance.'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {(['7d', '30d', '90d'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRange(value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  range === value
                    ? 'bg-accent text-accent-foreground shadow-glow'
                    : 'border border-white/10 text-muted-foreground hover:border-accent hover:text-foreground'
                }`}
              >
                {value === '7d' ? (locale === 'ar' ? '٧ أيام' : '7 Days') : null}
                {value === '30d' ? (locale === 'ar' ? '٣٠ يوماً' : '30 Days') : null}
                {value === '90d' ? (locale === 'ar' ? '٩٠ يوماً' : '90 Days') : null}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 self-start rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-xs text-muted-foreground shadow-inner">
          <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-success" aria-hidden />
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">
              {locale === 'ar' ? 'يتم تحديث المقاييس كل 60 ثانية' : 'Metrics refresh every 60 seconds'}
            </span>
            <span>
              {updatedAt
                ? `${locale === 'ar' ? 'آخر تحديث' : 'Last synced'} ${new Date(updatedAt).toLocaleString(
                    locale === 'ar' ? 'ar-EG' : 'en-US'
                  )}`
                : locale === 'ar'
                ? 'يتم تهيئة مركز البيانات'
                : 'Preparing data hub'}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((metric) => {
          const progressToneClass =
            metric.tone === 'positive' ? 'bg-success' : metric.tone === 'negative' ? 'bg-danger' : 'bg-accent'

          return (
            <div key={metric.id} className="rounded-2xl border border-white/10 bg-surface-strong/70 p-5 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-foreground">{metric.display}</span>
                {metric.suffix ? <span className="text-xs text-muted-foreground">{metric.suffix}</span> : null}
              </div>
              <MetricSparkline points={metric.series} range={range} tone={metric.tone} />
              <div className="mt-4 h-1 w-full rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${progressToneClass}`}
                  style={{ width: `${Math.max(progressForMetric(metric), 0.08) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

interface AlertBandProps {
  alerts: DashboardFraudAlert[] | null | undefined
  locale: Locale
}

function AlertBand({ alerts, locale }: AlertBandProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <section className="mt-6 rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
        {locale === 'ar'
          ? 'لا توجد تنبيهات حرجة حالياً. جميع الأنظمة مستقرة.'
          : 'All systems nominal. No critical alerts at this time.'}
      </section>
    )
  }

  const messages = alerts.slice(0, 3)

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-warning/30 bg-warning/10">
      <div className="flex flex-col divide-y divide-warning/20 text-sm">
        {messages.map((alert) => (
          <div key={alert.id ?? alert.reference ?? alert.description} className="flex items-center gap-4 px-4 py-3">
            <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-warning text-sm font-semibold text-black">
              ⚠️
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-foreground">
                {alert.reference ?? alert.description ?? 'Operational alert'}
              </span>
              <span className="text-xs text-muted-foreground">
                {alert.details ?? alert.description ?? 'New operational insight from the live data hub.'}
              </span>
            </div>
            <span className="ml-auto text-xs text-muted-foreground">
              {alert.detected_at ?? alert.detectedAt ?? alert.created_at ?? alert.createdAt ?? 'moments ago'}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

interface MetricSparklineProps {
  points?: DashboardMetricSeriesPoint[]
  range: MetricRange
  tone: 'positive' | 'negative' | 'neutral'
}

function MetricSparkline({ points, range, tone }: MetricSparklineProps) {
  const dataset = useMemo(() => filterSeriesByRange(points ?? [], range), [points, range])
  const geometry = useMemo(() => buildSparklineGeometry(dataset), [dataset])
  const toneClass = tone === 'positive' ? 'text-success' : tone === 'negative' ? 'text-danger' : 'text-accent'

  if (!geometry) {
    return <div className="mt-4 h-16 w-full rounded-xl bg-white/5" aria-hidden />
  }

  return (
    <svg
      aria-hidden="true"
      className={`mt-4 h-16 w-full ${toneClass}`}
      preserveAspectRatio="none"
      role="presentation"
      viewBox="0 0 100 100"
    >
      <path d={geometry.path} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <circle cx={geometry.lastX} cy={geometry.lastY} r={1.6} fill="currentColor" />
    </svg>
  )
}
