'use client';

import type { Locale } from '@brainsait/rejection-tracker';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

import { PHASE_TWO_ACADEMY, PHASE_TWO_APP_STORE, PHASE_TWO_PARTNERS } from '@/data/phase-two';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { HealthStatus } from '@/types/api';

import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';

interface AgentOverlayProps {
  locale: Locale;
  isOpen: boolean;
  onClose: () => void;
  metrics: Array<{
    id: string;
    label: string;
    value: string;
    helper: string;
  }>;
  metricSummary: {
    totalClaims: number;
    totalBilled: number;
    totalRejected: number;
    rejectionRate: number;
    recoveryRate: number;
    overdueLetters: number;
    complianceWithin30: number;
  };
  selectedAccount: {
    id: string;
    name: string;
    region?: string | null;
    code?: string | null;
  } | null;
  rejections: Array<{
    id: string;
    claimId: string;
    tpaName: string;
    insuranceCompany: string;
    branch: string;
    receptionMode: string;
    billedTotal: number;
    rejectedTotal: number;
    status: string;
    rejectionDate?: string;
  }>;
  letters: Array<{
    id: string;
    recipient: string;
    dueDate?: string;
    subject?: string | { en: string; ar: string };
    totalAmount?: number;
    claimReferences: string[];
  }>;
  fraudAlerts: Array<{
    id: string;
    description: string;
    severity: string;
    detectedAt: string | null;
    physician: string | null;
  }>;
  trendPoints: Array<{
    date: string;
    count: number;
    rejectedAmount?: number;
    recoveredCount?: number;
  }>;
  isHealthy: boolean;
  health: HealthStatus | null;
  onAction: (actionId: string) => void;
}

type AgentMessage = {
  id: string;
  author: 'agent' | 'user';
  text: string;
};

type SuspiciousEntry = {
  id?: string;
  claim_id?: string;
  claimId?: string;
  description?: string;
  event?: string;
  action?: string;
  timestamp?: string;
  created_at?: string;
  createdAt?: string;
  date?: string;
  amount?: number;
  score?: number;
  facility?: string;
  provider?: string;
};

const resolveNumberLocale = (locale: Locale) => (locale === 'ar' ? 'ar-SA' : 'en-US');

const formatCurrency = (value: number, locale: Locale) =>
  new Intl.NumberFormat(resolveNumberLocale(locale), {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: value >= 100_000 ? 0 : 1,
  }).format(value);

const formatPercent = (value: number, locale: Locale) =>
  new Intl.NumberFormat(resolveNumberLocale(locale), {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);

const formatNumber = (value: number, locale: Locale) =>
  new Intl.NumberFormat(resolveNumberLocale(locale)).format(value);

const formatDate = (value: string | null | undefined, locale: Locale) => {
  if (!value) {
    return locale === 'ar' ? 'غير محدد' : 'Not provided';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return locale === 'ar' ? 'غير معروف' : 'Unknown';
  }

  return date.toLocaleDateString(resolveNumberLocale(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const resolveSubject = (subject: string | { en: string; ar: string } | undefined, locale: Locale) => {
  if (!subject) {
    return locale === 'ar' ? 'بدون عنوان' : 'No subject';
  }

  if (typeof subject === 'string') {
    return subject;
  }

  return locale === 'ar' ? subject.ar : subject.en;
};

export function AgentOverlay({
  locale,
  isOpen,
  onClose,
  metrics,
  metricSummary,
  selectedAccount,
  rejections,
  letters,
  fraudAlerts,
  trendPoints,
  isHealthy,
  health,
  onAction,
}: Readonly<AgentOverlayProps>) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousEntry[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const insightLoadedRef = useRef(false);

  const suggestions = useMemo(
    () => [
      {
        id: 'rejection',
        label: locale === 'ar' ? 'إنشاء مطالبة مرفوضة' : 'Log a new rejection',
      },
      {
        id: 'compliance',
        label: locale === 'ar' ? 'مراجعة خطابات الامتثال' : 'Review compliance letters',
      },
      {
        id: 'fraud',
        label: locale === 'ar' ? 'تشغيل تحليل الاحتيال' : 'Run fraud analysis',
      },
      {
        id: 'predict',
        label: locale === 'ar' ? 'عرض التحليلات التنبؤية' : 'Open predictive analytics',
      },
      {
        id: 'audit',
        label: locale === 'ar' ? 'فتح سجل التدقيق' : 'Open audit trail',
      },
    ],
    [locale]
  );

  const greeting = useMemo(() => {
    const accountSuffix = selectedAccount?.name
      ? ` – ${selectedAccount.name}${selectedAccount.region ? ` (${selectedAccount.region})` : ''}`
      : '';

    return locale === 'ar'
      ? `أنا مساعد BrainSAIT الافتراضي${accountSuffix}. كيف أستطيع المساعدة اليوم؟`
      : `I am the BrainSAIT virtual agent${accountSuffix}. How can I assist today?`;
  }, [locale, selectedAccount]);

  useEffect(() => {
    if (isOpen) {
      insightLoadedRef.current = false;
      setSuspiciousActivity([]);
      setInsightError(null);
      setMessages([
        {
          id: 'agent-welcome',
          author: 'agent',
          text: greeting,
        },
      ]);
      setInput('');
    } else {
      setInput('');
    }
  }, [greeting, isOpen]);

  useEffect(() => {
    if (!endRef.current) {
      return;
    }

    endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let cancelled = false;

    const loadInsights = async () => {
      try {
        setLoadingInsights(true);
        const result = await apiClient.getSuspiciousActivity();
        if (cancelled) {
          return;
        }

        const normalized = Array.isArray(result) ? (result as SuspiciousEntry[]).slice(0, 5) : [];
        setSuspiciousActivity(normalized);

        if (!insightLoadedRef.current && normalized.length > 0) {
          const first = normalized[0];
          const description =
            first.description ?? first.event ?? first.action ?? (locale === 'ar' ? 'نشاط غير اعتيادي' : 'Unusual activity');
          const occurredAt = formatDate(first.timestamp ?? first.created_at ?? first.createdAt ?? first.date, locale);
          const message =
            locale === 'ar'
              ? `أحدث تنبيه مراقبة: ${description} (${occurredAt}). يمكنك متابعة التفاصيل من سجل التدقيق.`
              : `Fresh watch alert: ${description} (${occurredAt}). You can drill in from the audit trail.`;

          insightLoadedRef.current = true;
          setMessages((prev) => [
            ...prev,
            {
              id: `agent-insight-${Date.now()}`,
              author: 'agent',
              text: message,
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to load suspicious activity', error);
        if (cancelled) {
          return;
        }

        const message =
          locale === 'ar'
            ? 'تعذر تحميل تنبيهات التدقيق الآن. تحقق من الاتصال بالخدمة.'
            : 'Unable to load audit alerts now. Please confirm the service connection.';
        setInsightError(message);

        if (!insightLoadedRef.current) {
          insightLoadedRef.current = true;
          setMessages((prev) => [
            ...prev,
            {
              id: `agent-insight-error-${Date.now()}`,
              author: 'agent',
              text: message,
            },
          ]);
        }
      } finally {
        if (!cancelled) {
          setLoadingInsights(false);
        }
      }
    };

    loadInsights();

    return () => {
      cancelled = true;
    };
  }, [isOpen, locale]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const buildAgentResponse = (query: string): string => {
    const normalizedQuery = query.toLowerCase();
    const totalClaims = metricSummary.totalClaims ?? 0;

    const latestRejection = rejections[0];
    const dueSoonLetters = letters
      .filter((letter) => letter.dueDate)
      .sort((a, b) => new Date(a.dueDate ?? '').getTime() - new Date(b.dueDate ?? '').getTime())
      .slice(0, 3);

    const latestTrend = trendPoints[trendPoints.length - 1];
    const weekTrend = trendPoints.slice(-7);
    const trendAvg = weekTrend.length
      ? weekTrend.reduce((sum, point) => sum + point.count, 0) / weekTrend.length
      : null;

    if (normalizedQuery.includes('recovery')) {
      return locale === 'ar'
        ? `نسبة الاسترداد الحالية ${formatPercent(metricSummary.recoveryRate, locale)} مع ${formatNumber(
            Math.max(metricSummary.totalClaims - metricSummary.totalRejected, 0),
            locale
          )} مطالبات مستردة حتى الآن هذا الشهر.`
        : `Recovery is tracking at ${formatPercent(metricSummary.recoveryRate, locale)} with ${formatNumber(
            Math.max(metricSummary.totalClaims - metricSummary.totalRejected, 0),
            locale
          )} claims clawed back so far this month.`;
    }

    if (normalizedQuery.includes('rejection') || normalizedQuery.includes('denial') || normalizedQuery.includes('claim')) {
      if (!latestRejection) {
        return locale === 'ar'
          ? 'لا توجد مطالبات مرفوضة جديدة منذ آخر تحديث.'
          : 'No new denials have been logged since the last refresh.';
      }

      return locale === 'ar'
        ? `أحدث مطالبة مرفوضة ${latestRejection.claimId} مع ${latestRejection.tpaName} بقيمة ${formatCurrency(
            latestRejection.rejectedTotal,
            locale
          )} بتاريخ ${formatDate(latestRejection.rejectionDate, locale)}.`
        : `Newest denial ${latestRejection.claimId} from ${latestRejection.tpaName} is worth ${formatCurrency(
            latestRejection.rejectedTotal,
            locale
          )} logged on ${formatDate(latestRejection.rejectionDate, locale)}.`;
    }

    if (normalizedQuery.includes('letter') || normalizedQuery.includes('compliance')) {
      if (letters.length === 0) {
        return locale === 'ar'
          ? 'لا توجد خطابات امتثال بحاجة للمراجعة حالياً.'
          : 'There are no compliance letters requiring attention right now.';
      }

      const upcoming = dueSoonLetters[0];
      if (!upcoming) {
        return locale === 'ar'
          ? `لدينا ${letters.length} ${letters.length === 1 ? 'خطاباً' : 'خطابات'} قيد المتابعة دون مواعيد نهائية وشيكة.`
          : `We are tracking ${letters.length} open letters with no imminent due dates.`;
      }

      return locale === 'ar'
        ? `أقرب موعد استحقاق لخطاب ${resolveSubject(upcoming.subject, locale)} بتاريخ ${formatDate(
            upcoming.dueDate,
            locale
          )} بقيمة ${formatCurrency(upcoming.totalAmount ?? 0, locale)}.`
        : `Next compliance deadline is ${formatDate(upcoming.dueDate, locale)} for ${resolveSubject(
            upcoming.subject,
            locale
          )} valued at ${formatCurrency(upcoming.totalAmount ?? 0, locale)}.`;
    }

    if (
      normalizedQuery.includes('phase two') ||
      normalizedQuery.includes('phase-2') ||
      normalizedQuery.includes('app store') ||
      normalizedQuery.includes('marketplace') ||
      normalizedQuery.includes('academy') ||
      normalizedQuery.includes('training') ||
      normalizedQuery.includes('partner hub') ||
      normalizedQuery.includes('partner')
    ) {
      const appHighlights = PHASE_TWO_APP_STORE.slice(0, 2)
        .map((item) => item.title)
        .join(locale === 'ar' ? '، ' : ', ');
      const academyHighlights = PHASE_TWO_ACADEMY.slice(0, 2)
        .map((module) => `${module.title} (${module.duration})`)
        .join(locale === 'ar' ? '، ' : ', ');
      const partnerHighlights = PHASE_TWO_PARTNERS.slice(0, 2)
        .map((partner) => `${partner.name} – ${partner.status}`)
        .join(locale === 'ar' ? '، ' : ', ');

      return locale === 'ar'
        ? `معاينة المرحلة الثانية جاهزة: متجر التطبيقات يضم ${appHighlights}. الأكاديمية تقدم ${academyHighlights}. مركز الشركاء يحتوي على ${partnerHighlights}. يمكنك زيارة الصفحات المخصصة من قائمة المرحلة الثانية للاطلاع على التفاصيل.`
        : `Phase Two preview is live: App Store features ${appHighlights}. Academy tracks include ${academyHighlights}. Partner hub pipelines ${partnerHighlights}. Visit the Phase Two pages to review the full briefs.`;
    }

    if (
      normalizedQuery.includes('trend') ||
      normalizedQuery.includes('daily') ||
      normalizedQuery.includes('weekly') ||
      normalizedQuery.includes('timeline')
    ) {
      if (!latestTrend) {
        return locale === 'ar'
          ? 'لا تتوفر بيانات اتجاهات كافية بعد. حاول مرة أخرى عند توفر تحديثات جديدة.'
          : 'Trend analytics are not available yet. Try again once new telemetry arrives.';
      }

      const latestCount = formatNumber(latestTrend.count, locale);
      const average = trendAvg ? formatNumber(Math.round(trendAvg), locale) : locale === 'ar' ? 'غير متوفر' : 'n/a';

      return locale === 'ar'
        ? `سجلنا ${latestCount} حالات رفض في ${formatDate(latestTrend.date, locale)} ومتوسط الأسبوع ${average} يومياً.`
        : `Latest trend point shows ${latestCount} denials on ${formatDate(latestTrend.date, locale)} with a rolling weekly average of ${average} per day.`;
    }

    if (normalizedQuery.includes('fraud') || normalizedQuery.includes('alert') || normalizedQuery.includes('watchlist')) {
      const firstFraud = fraudAlerts[0];
      const firstSuspicious = suspiciousActivity[0];

      if (!firstFraud && !firstSuspicious) {
        return locale === 'ar'
          ? 'لا توجد تنبيهات احتيال أو مراقبة نشطة حالياً.'
          : 'No fraud or watch alerts are active at the moment.';
      }

      const description =
        firstFraud?.description ??
        firstSuspicious?.description ??
        firstSuspicious?.event ??
        (locale === 'ar' ? 'تنبيه مراقبة' : 'Watch alert');

      const occurredAt = formatDate(
        firstFraud?.detectedAt ??
          firstSuspicious?.timestamp ??
          firstSuspicious?.created_at ??
          firstSuspicious?.createdAt ??
          firstSuspicious?.date,
        locale
      );

      return locale === 'ar'
        ? `آخر تنبيه كان "${description}" بتاريخ ${occurredAt}. أوصي بفتح سجل التدقيق لاتخاذ إجراء.`
        : `Latest alert was "${description}" on ${occurredAt}. I recommend jumping into the audit trail next.`;
    }

    if (normalizedQuery.includes('health') || normalizedQuery.includes('status') || normalizedQuery.includes('uptime')) {
      const offlineServices =
        health?.services && typeof health.services === 'object'
          ? Object.entries(health.services)
              .filter(([, status]) =>
                typeof status === 'string' && status.toLowerCase() !== 'healthy' && status.toLowerCase() !== 'ok'
              )
              .map(([service]) => service)
          : [];

      if (isHealthy && offlineServices.length === 0) {
        return locale === 'ar'
          ? 'جميع الخدمات الأساسية تعمل بدون انقطاع وتمت آخر مزامنة مع قاعدة البيانات بنجاح.'
          : 'All core services are operating normally and the latest database sync completed successfully.';
      }

      if (offlineServices.length > 0) {
        const joined = offlineServices.join(', ');
        return locale === 'ar'
          ? `هناك خدمات تحتاج الانتباه: ${joined}. تحقق من لوحة الحالة لاتخاذ الإجراء المناسب.`
          : `Attention needed on: ${joined}. Check the system health panel for remediation steps.`;
      }

      return locale === 'ar'
        ? 'النظام مستقر بشكل عام مع بعض التحذيرات البسيطة. يمكن مراجعة لوحة الحالة للمزيد.'
        : 'Overall health is stable with a few minor warnings. Review the health board for details.';
    }

    if (normalizedQuery.includes('account') || normalizedQuery.includes('tenant') || normalizedQuery.includes('region')) {
      const accountLabel = selectedAccount?.name ?? (locale === 'ar' ? 'الحساب الافتراضي' : 'default account');
      const accountRegion = selectedAccount?.region ?? (locale === 'ar' ? 'السعودية' : 'KSA');

      return locale === 'ar'
        ? `نعرض حالياً بيانات ${accountLabel} لمنطقة ${accountRegion}. يمكنك التبديل عبر شريط الحسابات في الأعلى.`
        : `We are scoped to ${accountLabel} in the ${accountRegion} region. Switch accounts from the header selector when needed.`;
    }

    const formattedRejectionRate = formatPercent(metricSummary.rejectionRate, locale);
    const formattedRecovery = formatPercent(metricSummary.recoveryRate, locale);
    const formattedBilled = formatCurrency(metricSummary.totalBilled, locale);
    const formattedRejected = formatCurrency(metricSummary.totalRejected, locale);

    return locale === 'ar'
      ? `اللوحة محدثة. معدل الرفض ${formattedRejectionRate} مقابل ${formattedRecovery} للاسترداد من إجمالي فوترة ${formattedBilled} ورفض ${formattedRejected}. لدينا ${formatNumber(
          totalClaims,
          locale
        )} مطالبة في نطاق التحليل حالياً.`
      : `Dashboard is in sync: rejection rate at ${formattedRejectionRate} versus ${formattedRecovery} recovery on ${formattedBilled} billed and ${formattedRejected} denied. Tracking ${formatNumber(
          totalClaims,
          locale
        )} claims in scope right now.`;
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      author: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    const responseText = buildAgentResponse(trimmed);
    timeoutRef.current = window.setTimeout(() => {
      const agentResponse: AgentMessage = {
        id: `agent-${Date.now()}`,
        author: 'agent',
        text: responseText,
      };

      setMessages((prev) => [...prev, agentResponse]);
    }, 320);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 w-full rounded-t-3xl border-t border-white/10 bg-black/95 p-6 sm:inset-y-0 sm:right-0 sm:inset-x-auto sm:w-[420px] sm:rounded-none sm:border-l"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {locale === 'ar' ? 'مساعد BrainSAIT' : 'BrainSAIT Agent'}
                </h2>
                <p className="text-xs text-gray-400">
                  {locale === 'ar' ? 'يستخدم البيانات الحية من لوحة التحكم' : 'Grounded in live dashboard data'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm text-gray-200 transition hover:bg-white/10"
              >
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                {metrics.map((metric) => (
                  <div key={metric.id} className="text-sm text-gray-200">
                    <div className="font-semibold text-white">{metric.value}</div>
                    <div className="text-xs text-gray-400">{metric.label}</div>
                    <div className="text-[11px] text-gray-500">{metric.helper}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs font-medium text-gray-300">
                  <span>{locale === 'ar' ? 'قائمة مراقبة التدقيق' : 'Audit watchlist'}</span>
                  <span className="text-[11px] text-gray-500">
                    {loadingInsights
                      ? locale === 'ar'
                        ? 'جاري التحديث...'
                        : 'Refreshing...'
                      : suspiciousActivity.length > 0
                        ? `${suspiciousActivity.length} ${locale === 'ar' ? 'تنبيهات' : 'alerts'}`
                        : locale === 'ar'
                          ? 'لا يوجد تنبيهات'
                          : 'All clear'}
                  </span>
                </div>
                {insightError ? (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {insightError}
                  </p>
                ) : (
                  <div className="max-h-28 space-y-2 overflow-y-auto pr-2">
                    {suspiciousActivity.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        {locale === 'ar'
                          ? 'لم يتم تسجيل سلوك غير اعتيادي في آخر تحديث.'
                          : 'No anomalous behaviour detected on the latest pull.'}
                      </p>
                    ) : (
                      suspiciousActivity.map((entry, index) => {
                        const key =
                          entry.id ??
                          entry.claimId ??
                          entry.claim_id ??
                          `${entry.event ?? entry.description ?? 'suspicious'}-${index}`;

                        const description =
                          entry.description ??
                          entry.event ??
                          entry.action ??
                          (locale === 'ar' ? 'تنبيه مراقبة' : 'Watch alert');

                        const amount =
                          typeof entry.amount === 'number'
                            ? formatCurrency(entry.amount, locale)
                            : typeof entry.score === 'number'
                              ? `${entry.score.toFixed(1)} ${locale === 'ar' ? 'درجة مخاطرة' : 'risk score'}`
                              : null;

                        const timeLabel = formatDate(
                          entry.timestamp ?? entry.created_at ?? entry.createdAt ?? entry.date,
                          locale
                        );

                        const facility = entry.facility ?? entry.provider ?? null;

                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-gray-200"
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400">
                              <span>{timeLabel}</span>
                              {amount ? <span>{amount}</span> : null}
                            </div>
                            <div className="mt-1 font-semibold text-white">{description}</div>
                            {facility ? <div className="text-[11px] text-gray-400">{facility}</div> : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onAction('audit')}
                    className="text-[11px] text-brainsait-cyan transition hover:text-brainsait-blue"
                  >
                    {locale === 'ar' ? 'الانتقال إلى سجل التدقيق' : 'Open audit trail'}
                  </button>
                </div>
              </div>

              <div className="h-60 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                      message.author === 'agent'
                        ? 'bg-brainsait-blue/20 text-white'
                        : 'ml-auto bg-white/10 text-white'
                    )}
                  >
                    {message.text}
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs font-medium text-gray-300">
                  <span>{locale === 'ar' ? 'معاينة المرحلة الثانية' : 'Phase Two preview'}</span>
                  <span className="text-[11px] text-gray-500">
                    {locale === 'ar' ? 'متجر · أكاديمية · شركاء' : 'App Store · Academy · Partners'}
                  </span>
                </div>
                <div className="space-y-2 text-xs text-gray-300">
                  <div>
                    <div className="font-semibold text-white">
                      {locale === 'ar' ? 'متجر BrainSAIT' : 'BrainSAIT App Store'}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {PHASE_TWO_APP_STORE.slice(0, 2)
                        .map((item) => item.title)
                        .join(locale === 'ar' ? '، ' : ', ')}
                    </p>
                  </div>
                  <div>
                    <div className="font-semibold text-white">
                      {locale === 'ar' ? 'أكاديمية BrainSAIT' : 'BrainSAIT Academy'}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {PHASE_TWO_ACADEMY.slice(0, 2)
                        .map((module) => `${module.title} (${module.duration})`)
                        .join(locale === 'ar' ? '، ' : ', ')}
                    </p>
                  </div>
                  <div>
                    <div className="font-semibold text-white">
                      {locale === 'ar' ? 'مركز الشركاء' : 'Partner hub'}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {PHASE_TWO_PARTNERS.slice(0, 2)
                        .map((partner) => `${partner.name} – ${partner.status}`)
                        .join(locale === 'ar' ? '، ' : ', ')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onAction('phase-two-app-store')}
                    className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-gray-100 transition hover:bg-white/10"
                  >
                    {locale === 'ar' ? 'متجر التطبيقات' : 'App Store'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onAction('phase-two-academy')}
                    className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-gray-100 transition hover:bg-white/10"
                  >
                    {locale === 'ar' ? 'الأكاديمية' : 'Academy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onAction('phase-two-partners')}
                    className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-gray-100 transition hover:bg-white/10"
                  >
                    {locale === 'ar' ? 'مركز الشركاء' : 'Partner hub'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onAction(suggestion.id);
                    }}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs text-gray-100 transition hover:bg-white/10"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Textarea
                  rows={3}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={
                    locale === 'ar'
                      ? 'اكتب سؤالك أو اطلب تحديث لوحة التحكم'
                      : 'Type a question or request a dashboard update'
                  }
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button type="button" size="sm" onClick={handleSubmit} disabled={!input.trim()}>
                    {locale === 'ar' ? 'إرسال' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
