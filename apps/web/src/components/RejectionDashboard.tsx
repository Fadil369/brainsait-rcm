'use client';

import { Locale, UserRole } from '@brainsait/rejection-tracker';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, ChangeEvent, ReactNode } from 'react';

import { AgentOverlay } from '@/components/AgentOverlay';
import { useHealthCheck } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { useDashboardContext } from '@/providers/DashboardDataProvider';
import type {
  DashboardAccountSummary,
  DashboardComplianceLetter,
  DashboardFraudAlert,
  DashboardMetricSeriesPoint,
  DashboardRejectionRecord,
  HealthStatus,
} from '@/types/api';
import { buildSparklineGeometry, filterSeriesByRange, normalizeChartSeries } from '@/utils/dashboardSeries';
import type { SparklineGeometry } from '@/utils/dashboardSeries';

import { AuditTrailModal } from './AuditTrailModal';
import { CommandPalette } from './CommandPalette';
import { ComplianceLetterModal } from './ComplianceLetterModal';
import { CreateAppealModal } from './CreateAppealModal';
import { CreateRejectionModal } from './CreateRejectionModal';
import { FraudDetectionModal } from './FraudDetectionModal';
import { NPHIESModal } from './NPHIESModal';
import { PredictiveAnalyticsModal } from './PredictiveAnalyticsModal';
import { TeamsNotificationModal } from './TeamsNotificationModal';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Select } from './ui/Select';
import { Tabs, TabsList, TabsTrigger } from './ui/Tabs';
import { ThemeToggle } from './ui/ThemeToggle';
import { WhatsAppModal } from './WhatsAppModal';

interface DashboardProps {
  userRole: UserRole;
  locale: Locale;
  userName?: string;
  onLocaleChange?: (locale: Locale) => void;
}

type LocalizedText = { en: string; ar: string };

interface TrendPoint {
  date: string;
  count: number;
  rejectedAmount?: number;
  recoveredCount?: number;
  recoveryRate?: number;
  complianceRate?: number;
  alertsCount?: number;
}

type NavItem = {
  id: string;
  icon: string;
  label: LocalizedText;
};

type AccountOption = {
  id: string;
  name: string;
  region?: string | null;
  code?: string | null;
};

interface NormalizedRejection {
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
  within30Days?: boolean;
}

interface NormalizedLetter {
  id: string;
  recipient: string;
  dueDate?: string;
  daysOverdue?: number;
  subject?: string | LocalizedText;
  totalAmount?: number;
  claimReferences: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    icon: '📊',
    label: { en: 'Overview', ar: 'نظرة عامة' },
  },
  {
    id: 'claims',
    icon: '📁',
    label: { en: 'Claim Status', ar: 'حالة المطالبات' },
  },
  {
    id: 'compliance',
    icon: '⚖️',
    label: { en: 'Compliance', ar: 'الامتثال' },
  },
  {
    id: 'ai-insights',
    icon: '🤖',
    label: { en: 'AI Insights', ar: 'تحليلات ذكية' },
  },
  {
    id: 'audit',
    icon: '🛡️',
    label: { en: 'Audit Trail', ar: 'سجل المراجعة' },
  },
];

const ACTIONS: Array<{ id: string; icon: string; label: LocalizedText }> = [
  { id: 'rejection', icon: '➕', label: { en: 'Add Rejection', ar: 'إضافة مرفوض' } },
  { id: 'appeal', icon: '📝', label: { en: 'Create Appeal', ar: 'إنشاء استئناف' } },
  { id: 'fraud', icon: '🔍', label: { en: 'Fraud Detection', ar: 'كشف الاحتيال' } },
  { id: 'predict', icon: '📈', label: { en: 'Predictive Analytics', ar: 'تحليلات تنبؤية' } },
  { id: 'compliance', icon: '📄', label: { en: 'Compliance Letter', ar: 'خطاب امتثال' } },
  { id: 'teams', icon: '📢', label: { en: 'Teams Notification', ar: 'إشعار Teams' } },
  { id: 'nphies', icon: '🏥', label: { en: 'NPHIES Submit', ar: 'تقديم NPHIES' } },
  { id: 'whatsapp', icon: '💬', label: { en: 'WhatsApp Notice', ar: 'إشعار واتساب' } },
  { id: 'audit', icon: '🛡️', label: { en: 'Audit Trail', ar: 'سجل المراجعة' } },
];

export function RejectionDashboard({ userRole, locale, userName, onLocaleChange }: Readonly<DashboardProps>) {
  const router = useRouter();
  const { data, loading, error, refetch } = useDashboardContext();
  const { isHealthy, health } = useHealthCheck();
  const seriesLoading = loading;

  const [showCreateRejection, setShowCreateRejection] = useState(false);
  const [showCreateAppeal, setShowCreateAppeal] = useState(false);
  const [showFraudDetection, setShowFraudDetection] = useState(false);
  const [showPredictiveAnalytics, setShowPredictiveAnalytics] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showComplianceLetter, setShowComplianceLetter] = useState(false);
  const [showTeamsNotification, setShowTeamsNotification] = useState(false);
  const [showNPHIES, setShowNPHIES] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAgentOverlay, setShowAgentOverlay] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<string>('overview');

  const accountOptions = useMemo<AccountOption[]>(() => {
    const accounts = data?.analytics?.accounts;
    const analyticsAccounts: DashboardAccountSummary[] = Array.isArray(accounts)
      ? accounts
      : [];

    if (analyticsAccounts.length > 0) {
      return analyticsAccounts.map((account, index) => ({
        id: account.id ?? account.account_id ?? `account-${index}`,
        name: account.name ?? account.label ?? account.code ?? `Account ${index + 1}`,
        region: account.region ?? account.location ?? account.code ?? null,
        code: account.code ?? account.shortcode ?? null,
      }));
    }

    return [
      {
        id: 'brainsait-hq',
        name: locale === 'ar' ? 'مركز BrainSAIT الرئيسي' : 'BrainSAIT Headquarters',
        region: locale === 'ar' ? 'الرياض' : 'Riyadh',
        code: 'HQ',
      },
      {
        id: 'brainsait-network',
        name: locale === 'ar' ? 'شبكة BrainSAIT للرعاية' : 'BrainSAIT Care Network',
        region: locale === 'ar' ? 'الشبكة الإقليمية' : 'Regional Network',
        code: 'NET',
      },
    ];
  }, [data?.analytics?.accounts, locale]);

  useEffect(() => {
    if (accountOptions.length === 0) {
      setSelectedAccount(null);
      return;
    }

    const defaultAccount = accountOptions[0]?.id ?? null;
    if (!selectedAccount || !accountOptions.some((option) => option.id === selectedAccount)) {
      setSelectedAccount(defaultAccount);
    }
  }, [accountOptions, selectedAccount]);

  const selectedAccountOption = useMemo(() => {
    return accountOptions.find((option) => option.id === selectedAccount) ?? null;
  }, [accountOptions, selectedAccount]);

  const toggleMobileNav = useCallback(() => {
    setShowMobileNav((prev) => !prev);
  }, []);

  const closeMobileNav = useCallback(() => {
    setShowMobileNav(false);
  }, []);

  const overviewRef = useRef<HTMLElement>(null);
  const claimsRef = useRef<HTMLElement>(null);
  const complianceRef = useRef<HTMLElement>(null);
  const insightsRef = useRef<HTMLElement>(null);
  const auditRef = useRef<HTMLElement>(null);

  const handleNavClick = useCallback((sectionId: string) => {
    const targets: Record<string, React.RefObject<HTMLElement>> = {
      overview: overviewRef,
      claims: claimsRef,
      compliance: complianceRef,
      'ai-insights': insightsRef,
      audit: auditRef,
    };

    const target = targets[sectionId]?.current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveNav(sectionId);
      closeMobileNav();
    }
  }, [closeMobileNav]);

  const actionHandlers = useMemo(
    () => ({
      rejection: () => setShowCreateRejection(true),
      appeal: () => setShowCreateAppeal(true),
      fraud: () => setShowFraudDetection(true),
      predict: () => setShowPredictiveAnalytics(true),
      compliance: () => setShowComplianceLetter(true),
      teams: () => setShowTeamsNotification(true),
      nphies: () => setShowNPHIES(true),
      whatsapp: () => setShowWhatsApp(true),
      audit: () => setShowAuditTrail(true),
      'phase-two-app-store': () => router.push('/app-store'),
      'phase-two-academy': () => router.push('/academy'),
      'phase-two-partners': () => router.push('/partners'),
    }),
    [
      setShowCreateRejection,
      setShowCreateAppeal,
      setShowFraudDetection,
      setShowPredictiveAnalytics,
      setShowComplianceLetter,
      setShowTeamsNotification,
      setShowNPHIES,
      setShowWhatsApp,
      setShowAuditTrail,
      router,
    ]
  );

  const triggerAction = useCallback(
    (actionId: string) => {
      const handler = actionHandlers[actionId as keyof typeof actionHandlers];
      if (handler) {
        handler();
      }
    },
    [actionHandlers]
  );

  const isRTL = locale === 'ar';

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const entries: Array<[string, React.RefObject<HTMLElement>]> = [
      ['overview', overviewRef],
      ['claims', claimsRef],
      ['compliance', complianceRef],
      ['ai-insights', insightsRef],
      ['audit', auditRef],
    ];

    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const sectionId = visible.target.getAttribute('data-section');
          if (sectionId) {
            setActiveNav((current) => (current === sectionId ? current : sectionId));
          }
        }
      },
      {
        threshold: 0.35,
        rootMargin: '-20% 0px -40% 0px',
      }
    );

    entries.forEach(([, ref]) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleGlobalShortcuts = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowCommandPalette(true);
      }

      if (event.key === 'Escape') {
        setShowMobileNav(false);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  const metrics = data?.analytics?.metrics;
  const totalClaims = metrics?.total_claims ?? data?.rejections?.length ?? 0;
  const rejectionRate = metrics?.rejection_rate ?? 0;
  const recoveryRate = metrics?.recovery_rate ?? 0;
  const overdueLetters = metrics?.overdue_letters ?? 0;
  const totalBilled = metrics?.total_billed ?? 0;
  const totalRejected = metrics?.total_rejected ?? 0;
  const complianceWithin30 = metrics?.within_30_days_compliance ?? 0;

  const metricsSummary = {
    totalClaims,
    totalBilled,
    totalRejected,
    rejectionRate,
    recoveryRate,
    overdueLetters,
    complianceWithin30,
  } as const;

  const quickMetrics = useMemo(
    () => [
      {
        id: 'claims',
        label: locale === 'ar' ? 'مطالبات هذا الشهر' : 'Monthly claims',
        value: totalClaims.toLocaleString(locale === 'ar' ? 'ar' : 'en-US'),
        helper: locale === 'ar' ? 'إجمالي المطالبات المسجلة' : 'Total claims logged',
      },
      {
        id: 'rejection-rate',
        label: locale === 'ar' ? 'نسبة الرفض' : 'Rejection rate',
        value: `${(rejectionRate * 100).toFixed(1)}%`,
        helper: locale === 'ar' ? 'مقارنة بالهدف 8%' : 'Target ≤ 8%',
      },
      {
        id: 'recovery-rate',
        label: locale === 'ar' ? 'نسبة الاسترداد' : 'Recovery rate',
        value: `${(recoveryRate * 100).toFixed(1)}%`,
        helper: locale === 'ar' ? 'حملات الاسترداد الفعّالة' : 'Effective recovery campaigns',
      },
      {
        id: 'overdue',
        label: locale === 'ar' ? 'خطابات متأخرة' : 'Overdue letters',
        value: overdueLetters.toString(),
        helper:
          overdueLetters === 0
            ? locale === 'ar'
              ? 'لا يوجد متأخرات'
              : 'All on schedule'
            : locale === 'ar'
              ? 'بحاجة إلى متابعة عاجلة'
              : 'Needs urgent follow-up',
      },
    ],
    [locale, overdueLetters, rejectionRate, recoveryRate, totalClaims]
  );

  const commandItems = useMemo(
    () => {
      const translateText = (en: string, ar: string) => (locale === 'ar' ? ar : en);

      return [
        {
          id: 'goto-overview',
          title: translateText('Go to overview', 'الانتقال إلى النظرة العامة'),
          icon: '📊',
          group: translateText('Navigate', 'التنقل'),
          action: () => handleNavClick('overview'),
        },
        {
          id: 'goto-claims',
          title: translateText('Go to claims performance', 'الانتقال إلى أداء المطالبات'),
          icon: '📁',
          group: translateText('Navigate', 'التنقل'),
          action: () => handleNavClick('claims'),
        },
        {
          id: 'goto-compliance',
          title: translateText('Go to compliance', 'الانتقال إلى الامتثال'),
          icon: '⚖️',
          group: translateText('Navigate', 'التنقل'),
          action: () => handleNavClick('compliance'),
        },
        {
          id: 'goto-insights',
          title: translateText('Go to AI insights', 'الانتقال إلى رؤى الذكاء الاصطناعي'),
          icon: '🤖',
          group: translateText('Navigate', 'التنقل'),
          action: () => handleNavClick('ai-insights'),
        },
        {
          id: 'open-rejection',
          title: translateText('Log a new rejection', 'تسجيل مطالبة مرفوضة جديدة'),
          icon: '➕',
          group: translateText('Workflows', 'التدفقات'),
          action: () => triggerAction('rejection'),
        },
        {
          id: 'open-appeal',
          title: translateText('Create appeal draft', 'إنشاء مسودة استئناف'),
          icon: '📝',
          group: translateText('Workflows', 'التدفقات'),
          action: () => triggerAction('appeal'),
        },
        {
          id: 'open-fraud',
          title: translateText('Run fraud analysis', 'تشغيل تحليل الاحتيال'),
          icon: '🔍',
          group: translateText('Workflows', 'التدفقات'),
          action: () => triggerAction('fraud'),
        },
        {
          id: 'open-agent',
          title: translateText('Ask BrainSAIT agent', 'اسأل مساعد BrainSAIT'),
          icon: '🧠',
          group: translateText('Assistant', 'المساعد'),
          action: () => setShowAgentOverlay(true),
        },
        {
          id: 'mobile-actions',
          title: translateText('Show quick mobile actions', 'عرض الإجراءات السريعة للموبايل'),
          icon: '📱',
          group: translateText('Assistant', 'المساعد'),
          action: () => setShowMobileActions(true),
        },
        {
          id: 'open-app-store',
          title: translateText('Open App Store preview', 'فتح معاينة متجر التطبيقات'),
          icon: '🛍️',
          group: translateText('Phase Two', 'المرحلة الثانية'),
          action: () => router.push('/app-store'),
        },
        {
          id: 'open-academy',
          title: translateText('Open Training Academy', 'فتح أكاديمية التدريب'),
          icon: '🎓',
          group: translateText('Phase Two', 'المرحلة الثانية'),
          action: () => router.push('/academy'),
        },
        {
          id: 'open-partners',
          title: translateText('Open Partner Hub', 'فتح مركز الشركاء'),
          icon: '🤝',
          group: translateText('Phase Two', 'المرحلة الثانية'),
          action: () => router.push('/partners'),
        },
      ];
    },
    [handleNavClick, locale, router, triggerAction, setShowAgentOverlay, setShowMobileActions]
  );

  const toggleMobileActions = useCallback(() => {
    setShowMobileActions((prev) => !prev);
  }, []);

  const closeMobileActions = useCallback(() => {
    setShowMobileActions(false);
  }, []);

  const normalizedRejections = useMemo<NormalizedRejection[]>(() => {
    if (!data?.rejections) return [];
    return data.rejections.map(normalizeRejectionRecord).slice(0, 6);
  }, [data?.rejections]);

  const normalizedLetters = useMemo<NormalizedLetter[]>(() => {
    if (!data?.letters) return [];
    return data.letters.map(normalizeLetter).slice(0, 5);
  }, [data?.letters]);

  const fraudAlerts = useMemo(() => {
    const latestAlerts = data?.analytics?.recent_alerts;
    const alerts: DashboardFraudAlert[] = Array.isArray(latestAlerts) ? latestAlerts : [];

    return alerts.map((alert) => ({
      id: stringifyId(alert),
      description: alert.description ?? alert.details ?? '—',
      severity: alert.severity ?? 'MEDIUM',
      detectedAt: alert.detected_at ?? alert.detectedAt ?? alert.created_at ?? null,
      physician: alert.physician_name ?? alert.physician ?? null,
    })).slice(0, 5);
  }, [data?.analytics?.recent_alerts]);

  const {
    claims: claimsSeries,
    recovery: recoverySeries,
    compliance: complianceSeries,
    alerts: alertsSeries,
  } = useMemo(() => {
    const normalized = normalizeChartSeries(
      data?.analytics?.chart_series ?? data?.analytics?.chartSeries
    );

    const pickSeries = (...keys: string[]) => {
      for (const key of keys) {
        const candidate = normalized[key];
        if (candidate && candidate.length > 0) {
          return candidate;
        }
      }
      const fallback = keys[0];
      return fallback ? normalized[fallback] ?? [] : [];
    };

    return {
      claims: filterSeriesByRange(pickSeries('claims', 'total_claims', 'rejections', 'denials'), '90d'),
      recovery: filterSeriesByRange(pickSeries('recovery_rate', 'recovery'), '90d'),
      compliance: filterSeriesByRange(
        pickSeries('within_30_days_compliance', 'compliance', 'compliance_rate'),
        '90d'
      ),
      alerts: filterSeriesByRange(pickSeries('fraud_alerts', 'alerts'), '90d'),
    };
  }, [data?.analytics?.chart_series, data?.analytics?.chartSeries]);

  const claimsWindow = useMemo(() => claimsSeries.slice(-14), [claimsSeries]);

  const sparkline = useMemo<SparklineGeometry | null>(
    () => buildSparklineGeometry(claimsWindow),
    [claimsWindow]
  );

  const trendPoints = useMemo<TrendPoint[]>(() => {
    if (claimsWindow.length === 0) {
      return [];
    }

    const recoveryLookup = createSeriesLookup(recoverySeries);
    const complianceLookup = createSeriesLookup(complianceSeries);
    const alertsLookup = createSeriesLookup(alertsSeries);

    return claimsWindow.map((point) => {
      const key = resolveSeriesKey(point);
      const countValue = typeof point.value === 'number' ? point.value : Number(point.value ?? 0);

      return {
        date: resolveSeriesDate(point),
        count: Number.isFinite(countValue) ? countValue : 0,
        recoveryRate: resolveLookupValue(recoveryLookup, key),
        complianceRate: resolveLookupValue(complianceLookup, key),
        alertsCount: resolveLookupValue(alertsLookup, key),
      };
    });
  }, [alertsSeries, claimsWindow, complianceSeries, recoverySeries]);

  if (loading) {
    return <DashboardLoading locale={locale} />;
  }

  if (error) {
    return <DashboardError locale={locale} onRetry={refetch} />;
  }

  return (
    <>
      <DashboardView
        locale={locale}
        direction={isRTL ? 'rtl' : 'ltr'}
        userRole={userRole}
        userName={userName}
        onLocaleChange={onLocaleChange}
        accounts={accountOptions}
        selectedAccount={selectedAccount}
  onAccountChange={(accountId: string | null) => setSelectedAccount(accountId)}
        isHealthy={isHealthy}
        health={health}
        activeNav={activeNav}
        onNavigate={handleNavClick}
        onToggleMobileNav={toggleMobileNav}
        showMobileNav={showMobileNav}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onToggleAgent={() => setShowAgentOverlay(true)}
        sectionRefs={{
          overview: overviewRef,
          claims: claimsRef,
          compliance: complianceRef,
          insights: insightsRef,
          audit: auditRef,
        }}
        metrics={metricsSummary}
        quickMetrics={quickMetrics}
        normalizedRejections={normalizedRejections}
        normalizedLetters={normalizedLetters}
        fraudAlerts={fraudAlerts}
        trendPoints={trendPoints}
  sparkline={sparkline}
  seriesLoading={seriesLoading}
        lastUpdated={data?.analytics?.updated_at ?? new Date().toISOString()}
        onRefresh={refetch}
        onAction={triggerAction}
        showMobileActions={showMobileActions}
        onToggleMobileActions={toggleMobileActions}
        onCloseMobileActions={closeMobileActions}
      />
      <MobileNavDrawer
        locale={locale}
        open={showMobileNav}
        activeNav={activeNav}
        accounts={accountOptions}
        selectedAccount={selectedAccount}
  onAccountChange={(accountId: string | null) => setSelectedAccount(accountId)}
        onNavigate={handleNavClick}
        onClose={closeMobileNav}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onContactAgent={() => setShowAgentOverlay(true)}
      />
      <ActionModals
        locale={locale}
        show={{
          createRejection: showCreateRejection,
          createAppeal: showCreateAppeal,
          fraudDetection: showFraudDetection,
          predictiveAnalytics: showPredictiveAnalytics,
          whatsapp: showWhatsApp,
          complianceLetter: showComplianceLetter,
          teamsNotification: showTeamsNotification,
          nphies: showNPHIES,
          auditTrail: showAuditTrail,
        }}
        close={{
          createRejection: () => setShowCreateRejection(false),
          createAppeal: () => setShowCreateAppeal(false),
          fraudDetection: () => setShowFraudDetection(false),
          predictiveAnalytics: () => setShowPredictiveAnalytics(false),
          whatsapp: () => setShowWhatsApp(false),
          complianceLetter: () => setShowComplianceLetter(false),
          teamsNotification: () => setShowTeamsNotification(false),
          nphies: () => setShowNPHIES(false),
          auditTrail: () => setShowAuditTrail(false),
        }}
        onSuccess={refetch}
      />
      <CommandPalette
        locale={locale}
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commandItems}
      />
      <AgentOverlay
        locale={locale}
        isOpen={showAgentOverlay}
        onClose={() => setShowAgentOverlay(false)}
        metrics={quickMetrics}
        metricSummary={metricsSummary}
        selectedAccount={selectedAccountOption}
        rejections={normalizedRejections}
        letters={normalizedLetters}
        fraudAlerts={fraudAlerts}
        trendPoints={trendPoints}
        isHealthy={isHealthy}
        health={health}
        onAction={triggerAction}
      />
    </>
  );
}

function DashboardLoading({ locale }: Readonly<{ locale: Locale }>) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="text-white text-2xl font-semibold">
          {translate(locale, { en: 'Loading dashboard data', ar: 'جاري تحميل لوحة التحكم' })}
        </div>
        <div className="w-64 h-1.5 bg-white/10 overflow-hidden rounded-full">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
            className="w-1/3 h-full bg-gradient-to-r from-brainsait-cyan to-brainsait-blue"
          />
        </div>
      </div>
    </div>
  );
}

function DashboardError({ locale, onRetry }: Readonly<{ locale: Locale; onRetry: () => void }>) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="glass-morphism max-w-lg w-full rounded-2xl p-8 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-2xl font-semibold text-white">
          {translate(locale, { en: 'Unable to load data', ar: 'تعذر تحميل البيانات' })}
        </h2>
        <p className="text-gray-300 text-sm">
          {translate(locale, {
            en: 'Ensure the API is running at http://localhost:8000 and that your credentials are valid.',
            ar: 'تأكد من تشغيل واجهة البرمجة على العنوان http://localhost:8000 وأن بيانات الاعتماد صحيحة.'
          })}
        </p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-gradient-to-r from-brainsait-cyan to-brainsait-blue text-white rounded-lg hover:shadow-xl transition"
        >
          {translate(locale, { en: 'Retry', ar: 'إعادة المحاولة' })}
        </button>
      </div>
    </div>
  );
}

function DashboardView({
  locale,
  direction,
  userRole,
  userName,
  onLocaleChange,
  accounts,
  selectedAccount,
  onAccountChange,
  isHealthy,
  health,
  activeNav,
  onNavigate,
  onToggleMobileNav,
  showMobileNav,
  onOpenCommandPalette,
  onToggleAgent,
  sectionRefs,
  metrics,
  quickMetrics,
  normalizedRejections,
  normalizedLetters,
  fraudAlerts,
  trendPoints,
  sparkline,
  seriesLoading,
  lastUpdated,
  onRefresh,
  onAction,
  showMobileActions,
  onToggleMobileActions,
  onCloseMobileActions,
}: Readonly<{
  locale: Locale;
  direction: 'ltr' | 'rtl';
  userRole: UserRole;
  userName?: string;
  onLocaleChange?: (locale: Locale) => void;
  accounts: AccountOption[];
  selectedAccount: string | null;
  onAccountChange: (accountId: string | null) => void;
  isHealthy: boolean;
  health: HealthStatus | null;
  activeNav: string;
  onNavigate: (sectionId: string) => void;
  onToggleMobileNav: () => void;
  showMobileNav: boolean;
  onOpenCommandPalette: () => void;
  onToggleAgent: () => void;
  sectionRefs: {
    overview: React.RefObject<HTMLElement>;
    claims: React.RefObject<HTMLElement>;
    compliance: React.RefObject<HTMLElement>;
    insights: React.RefObject<HTMLElement>;
    audit: React.RefObject<HTMLElement>;
  };
  metrics: {
    totalClaims: number;
    totalBilled: number;
    totalRejected: number;
    rejectionRate: number;
    recoveryRate: number;
    overdueLetters: number;
    complianceWithin30: number;
  };
  quickMetrics: Array<{
    id: string;
    label: string;
    value: string;
    helper: string;
  }>;
  normalizedRejections: NormalizedRejection[];
  normalizedLetters: NormalizedLetter[];
  fraudAlerts: Array<{
    id: string;
    description: string;
    severity: string;
    detectedAt: string | null;
    physician: string | null;
  }>;
  trendPoints: TrendPoint[];
  sparkline: SparklineGeometry | null;
  seriesLoading: boolean;
  lastUpdated: string;
  onRefresh: () => void;
  onAction: (actionId: string) => void;
  showMobileActions: boolean;
  onToggleMobileActions: () => void;
  onCloseMobileActions: () => void;
}>): JSX.Element {
  const {
    totalClaims,
    totalBilled,
    totalRejected,
    rejectionRate,
    recoveryRate,
    overdueLetters,
    complianceWithin30,
  } = metrics;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black" dir={direction}>
      <div className="absolute inset-0 z-0">
  <div className="absolute inset-0 bg-gradient-to-br from-brainsait-midnight via-black to-brainsait-violet opacity-80" />
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.15),transparent_55%)]" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
  <aside className="hidden lg:flex lg:w-72 xl:w-80 flex-col border-r border-foreground/10 bg-surface-base/60 backdrop-blur-xl">
          <div className="p-6 border-b border-white/10">
            <div className="text-3xl mb-2">🧠</div>
            <h2 className="text-xl font-semibold text-white">BrainSAIT</h2>
            <p className="text-sm text-gray-300">
              {locale === 'ar' ? 'إدارة المطالبات الطبية المتطورة' : 'Advanced medical claims operations'}
            </p>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition border border-transparent text-secondary-foreground',
                  activeNav === item.id
                    ? 'bg-foreground/10 text-foreground border-foreground/20 shadow-glow'
                    : 'hover:text-foreground hover:bg-foreground/5'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{translate(locale, item.label)}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 space-y-3 border-t border-white/10">
            <SidebarMetric
              title={locale === 'ar' ? 'حالة النظام' : 'System status'}
              value={isHealthy
                ? translate(locale, { en: 'Online', ar: 'متصل' })
                : translate(locale, { en: 'Degraded', ar: 'متقطع' })}
              accent={isHealthy ? 'text-green-400' : 'text-orange-400'}
            />
            <SidebarMetric
              title={locale === 'ar' ? 'الشهر الحالي' : 'Current month'}
              value={`${totalClaims} ${locale === 'ar' ? 'مطالبة' : 'claims'}`}
              accent="text-brainsait-cyan"
            />
            <SidebarMetric
              title={locale === 'ar' ? 'دور المستخدم' : 'Role'}
              value={translateRole(userRole, locale)}
              accent="text-white"
            />
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="px-4 sm:px-6 py-4 border-b border-foreground/10 bg-background/70 backdrop-blur-xl flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={onToggleMobileNav}
                  aria-pressed={showMobileNav}
                  aria-label={locale === 'ar' ? 'فتح قائمة التنقل' : 'Open navigation menu'}
                  className="lg:hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-gray-100 hover:bg-white/10 transition"
                >
                  {locale === 'ar' ? 'قائمة' : 'Menu'}
                </button>
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-400">
                    {locale === 'ar' ? 'لوحة إدارة المطالبات' : 'Claims operations cockpit'}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-white">
                    {locale === 'ar' ? 'مرحباً' : 'Welcome'}, {userName ?? (locale === 'ar' ? 'فريق المطالبات' : 'Claims Team')} 👋
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 justify-end">
                <div className="w-full min-w-[220px] sm:w-auto sm:max-w-xs">
                  <AccountSwitcher
                    locale={locale}
                    accounts={accounts}
                    selectedAccount={selectedAccount}
                    onChange={onAccountChange}
                  />
                </div>
                <HealthBadge isHealthy={isHealthy} locale={locale} databaseStatus={health?.database} />
                <ThemeToggle locale={locale} />
                <LocaleToggle locale={locale} onChange={onLocaleChange} />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onOpenCommandPalette}
                  className="text-xs uppercase tracking-wide"
                  locale={locale}
                >
                  {locale === 'ar' ? 'لوحة الأوامر' : 'Command palette'}
                </Button>
                <Button type="button" size="sm" variant="primary" onClick={onToggleAgent} locale={locale}>
                  {locale === 'ar' ? 'مساعد BrainSAIT' : 'Ask BrainSAIT agent'}
                </Button>
                <div className="glass-morphism rounded-2xl px-4 py-2 flex items-center gap-3">
                  <div className="hidden sm:block text-xs text-gray-300 leading-tight">
                    <div>{locale === 'ar' ? 'آخر تحديث' : 'Last sync'}</div>
                    <div className="font-semibold text-white">
                      {formatDateTime(lastUpdated, locale)}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brainsait-cyan/60 to-brainsait-blue/60 flex items-center justify-center text-lg">
                    {userName ? userName.charAt(0).toUpperCase() : 'B'}
                  </div>
                </div>
              </div>
            </div>

            <QuickMetricsRibbon locale={locale} metrics={quickMetrics} />
          </header>

          <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-24 sm:pb-10">
            <div className="pt-6 lg:hidden">
              <Tabs
                value={activeNav}
                onValueChange={onNavigate}
                locale={locale}
                defaultValue={NAV_ITEMS[0]?.id}
              >
                <TabsList className="w-full flex-nowrap overflow-x-auto">
                  {NAV_ITEMS.map((item) => (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      icon={item.icon}
                      className="whitespace-nowrap"
                    >
                      {translate(locale, item.label)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="py-8 space-y-12">
              <OverviewSection
                locale={locale}
                sectionRef={sectionRefs.overview}
                metrics={{
                  totalClaims,
                  totalBilled,
                  totalRejected,
                  rejectionRate,
                  recoveryRate,
                  overdueLetters,
                  complianceWithin30,
                }}
                trendPoints={trendPoints}
                sparkline={sparkline}
                seriesLoading={seriesLoading}
                onRefresh={onRefresh}
                onAction={onAction}
              />

              <ClaimsSection
                locale={locale}
                sectionRef={sectionRefs.claims}
                onAction={onAction}
                rejections={normalizedRejections}
              />

              <ComplianceSection
                locale={locale}
                sectionRef={sectionRefs.compliance}
                onAction={onAction}
                letters={normalizedLetters}
                overdueLetters={overdueLetters}
              />

              <InsightsSection
                locale={locale}
                sectionRef={sectionRefs.insights}
                onAction={onAction}
                fraudAlerts={fraudAlerts}
              />

              <AuditSection
                locale={locale}
                sectionRef={sectionRefs.audit}
                onAction={onAction}
                isHealthy={isHealthy}
                health={health}
                lastUpdated={lastUpdated}
                onRefresh={onRefresh}
              />
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {showMobileActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={onCloseMobileActions}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMobileActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-4 left-4 z-50 lg:hidden"
          >
            <div className="glass-morphism rounded-2xl p-4 grid grid-cols-2 gap-3">
              {ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    onCloseMobileActions();
                    onAction(action.id);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-sm text-gray-200 hover:bg-white/15 transition"
                >
                  <span>{action.icon}</span>
                  <span>{translate(locale, action.label)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onToggleMobileActions}
        className="lg:hidden fixed bottom-6 right-6 z-40 rounded-full bg-gradient-to-r from-brainsait-cyan to-brainsait-blue text-white shadow-2xl w-14 h-14 flex items-center justify-center text-3xl"
      >
        {showMobileActions ? '×' : '+'}
      </button>
    </div>
  );
}

function AccountSwitcher({
  locale,
  accounts,
  selectedAccount,
  onChange,
}: Readonly<{
  locale: Locale;
  accounts: AccountOption[];
  selectedAccount: string | null;
  onChange: (accountId: string | null) => void;
}>) {
  if (!accounts.length) {
    return null;
  }

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value ?? null);
  };

  const helper = locale === 'ar' ? 'تشغيل متعدد المواقع' : 'Multi-facility operations';

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wide text-gray-400" htmlFor="account-switcher">
        {locale === 'ar' ? 'الحساب التشغيلي' : 'Operational account'}
      </label>
      <Select
        id="account-switcher"
        value={selectedAccount ?? accounts[0].id}
        onChange={handleChange}
        aria-label={locale === 'ar' ? 'اختيار حساب تشغيلي' : 'Select operational account'}
      >
        {accounts.map((account) => {
          const suffix = account.region ? ` - ${account.region}` : account.code ? ` (${account.code})` : '';
          return (
            <option key={account.id} value={account.id}>
              {account.name}{suffix}
            </option>
          );
        })}
      </Select>
      <span className="text-[11px] text-gray-500">{helper}</span>
    </div>
  );
}

function QuickMetricsRibbon({
  locale,
  metrics,
}: Readonly<{
  locale: Locale;
  metrics: Array<{
    id: string;
    label: string;
    value: string;
    helper: string;
  }>;
}>) {
  if (!metrics.length) {
    return null;
  }

  return (
    <div className="glass-morphism rounded-2xl border border-white/10 px-4 py-3">
      <div className="flex items-center gap-6 overflow-x-auto">
        {metrics.map((metric) => (
          <div key={metric.id} className="min-w-[140px]">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">
              {metric.label}
            </p>
            <p className="text-xl font-semibold text-white">{metric.value}</p>
            <p className="text-[11px] text-gray-500">{metric.helper}</p>
          </div>
        ))}
        <div className="hidden sm:flex flex-col text-right text-[11px] text-gray-500 ml-auto">
          <span>{locale === 'ar' ? 'متابعة الأداء' : 'Performance watchlist'}</span>
          <span>{locale === 'ar' ? 'يتم التحديث كل ساعة' : 'Auto-refreshing hourly'}</span>
        </div>
      </div>
    </div>
  );
}

function ActionModals({
  locale,
  show,
  close,
  onSuccess,
}: Readonly<{
  locale: Locale;
  show: {
    createRejection: boolean;
    createAppeal: boolean;
    fraudDetection: boolean;
    predictiveAnalytics: boolean;
    whatsapp: boolean;
    complianceLetter: boolean;
    teamsNotification: boolean;
    nphies: boolean;
    auditTrail: boolean;
  };
  close: {
    createRejection: () => void;
    createAppeal: () => void;
    fraudDetection: () => void;
    predictiveAnalytics: () => void;
    whatsapp: () => void;
    complianceLetter: () => void;
    teamsNotification: () => void;
    nphies: () => void;
    auditTrail: () => void;
  };
  onSuccess: () => void;
}>): JSX.Element {
  return (
    <>
      <CreateRejectionModal
        isOpen={show.createRejection}
        onClose={close.createRejection}
        onSuccess={onSuccess}
        locale={locale}
      />
      <CreateAppealModal
        isOpen={show.createAppeal}
        onClose={close.createAppeal}
        onSuccess={onSuccess}
        locale={locale}
      />
      <FraudDetectionModal
        isOpen={show.fraudDetection}
        onClose={close.fraudDetection}
        locale={locale}
      />
      <PredictiveAnalyticsModal
        isOpen={show.predictiveAnalytics}
        onClose={close.predictiveAnalytics}
        locale={locale}
      />
      <WhatsAppModal
        isOpen={show.whatsapp}
        onClose={close.whatsapp}
        locale={locale}
      />
      <ComplianceLetterModal
        isOpen={show.complianceLetter}
        onClose={close.complianceLetter}
        onSuccess={onSuccess}
        locale={locale}
      />
      <TeamsNotificationModal
        isOpen={show.teamsNotification}
        onClose={close.teamsNotification}
        locale={locale}
      />
      <NPHIESModal
        isOpen={show.nphies}
        onClose={close.nphies}
        onSuccess={onSuccess}
        locale={locale}
      />
      <AuditTrailModal
        isOpen={show.auditTrail}
        onClose={close.auditTrail}
        locale={locale}
      />
    </>
  );
}

function OverviewSection({
  locale,
  sectionRef,
  metrics,
  trendPoints,
  sparkline,
  seriesLoading,
  onRefresh,
  onAction,
}: Readonly<{
  locale: Locale;
  sectionRef: React.RefObject<HTMLElement>;
  metrics: {
    totalClaims: number;
    totalBilled: number;
    totalRejected: number;
    rejectionRate: number;
    recoveryRate: number;
    overdueLetters: number;
    complianceWithin30: number;
  };
  trendPoints: TrendPoint[];
  sparkline: SparklineGeometry | null;
  seriesLoading: boolean;
  onRefresh: () => void;
  onAction: (actionId: string) => void;
}>): JSX.Element {
  const {
    totalClaims,
    totalBilled,
    totalRejected,
    rejectionRate,
    recoveryRate,
    overdueLetters,
    complianceWithin30,
  } = metrics;
  return (
    <section ref={sectionRef} data-section="overview" className="space-y-6">
      <SectionHeading
        locale={locale}
        title={{ en: 'Operations overview', ar: 'نظرة عامة على العمليات' }}
        description={{
          en: 'Live claims, compliance, and AI-driven insights refreshed in real time.',
          ar: 'بيانات مباشرة للمطالبات والالتزام ورؤى الذكاء الاصطناعي يتم تحديثها لحظيًا.'
        }}
        action={(
          <div className="flex flex-wrap gap-3">
            <Button size="sm" variant="secondary" onClick={onRefresh}>
              {locale === 'ar' ? 'تحديث البيانات' : 'Refresh data'}
            </Button>
            <Button size="sm" onClick={() => onAction('rejection')} icon="➕">
              {locale === 'ar' ? 'إضافة مطالبة' : 'New rejection'}
            </Button>
          </div>
        )}
      />

      <MetricGrid
        locale={locale}
        totalClaims={totalClaims}
        totalBilled={totalBilled}
        totalRejected={totalRejected}
        rejectionRate={rejectionRate}
        recoveryRate={recoveryRate}
        overdueLetters={overdueLetters}
        complianceWithin30={complianceWithin30}
      />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <TrendCard
          locale={locale}
          points={trendPoints}
          sparkline={sparkline}
          loading={seriesLoading}
        />
        <QuickActionPanel locale={locale} onAction={onAction} />
      </div>
    </section>
  );
}

function MobileNavDrawer({
  locale,
  open,
  activeNav,
  accounts,
  selectedAccount,
  onAccountChange,
  onNavigate,
  onClose,
  onOpenCommandPalette,
  onContactAgent,
}: Readonly<{
  locale: Locale;
  open: boolean;
  activeNav: string;
  accounts: AccountOption[];
  selectedAccount: string | null;
  onAccountChange: (accountId: string | null) => void;
  onNavigate: (sectionId: string) => void;
  onClose: () => void;
  onOpenCommandPalette: () => void;
  onContactAgent: () => void;
}>) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-80 max-w-full bg-black/90 backdrop-blur-xl border-r border-white/10 p-4 space-y-6 lg:hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {locale === 'ar' ? 'قائمة التنقل' : 'Navigation'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/10 px-3 py-1 text-sm text-gray-200 hover:bg-white/10 transition"
                >
                  {locale === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
              <AccountSwitcher
                locale={locale}
                accounts={accounts}
                selectedAccount={selectedAccount}
                onChange={onAccountChange}
              />
            </div>

            <nav className="space-y-2 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-left text-sm transition',
                    activeNav === item.id
                      ? 'border-foreground/30 bg-foreground/10 text-white'
                      : 'border-transparent bg-white/5 text-gray-200 hover:bg-white/10'
                  )}
                >
                  <span className="mr-2" aria-hidden="true">{item.icon}</span>
                  {translate(locale, item.label)}
                </button>
              ))}
            </nav>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <Button
                type="button"
                fullWidth
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenCommandPalette();
                }}
                locale={locale}
              >
                {locale === 'ar' ? 'لوحة الأوامر' : 'Open command palette'}
              </Button>
              <Button
                type="button"
                fullWidth
                size="sm"
                onClick={() => {
                  onClose();
                  onContactAgent();
                }}
                locale={locale}
              >
                {locale === 'ar' ? 'التحدث مع المساعد' : 'Talk to the agent'}
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ClaimsSection({
  locale,
  sectionRef,
  onAction,
  rejections,
}: Readonly<{
  locale: Locale;
  sectionRef: React.RefObject<HTMLElement>;
  onAction: (actionId: string) => void;
  rejections: NormalizedRejection[];
}>): JSX.Element {
  return (
    <section ref={sectionRef} data-section="claims" className="space-y-6">
      <SectionHeading
        locale={locale}
        title={{ en: 'Claims performance', ar: 'أداء المطالبات' }}
        description={{
          en: 'Track high-impact rejections and fast-track appeals coordination.',
          ar: 'تابع المطالبات عالية الأثر وسرّع التنسيق في الاستئنافات.'
        }}
        action={(
          <Button size="sm" variant="ghost" onClick={() => onAction('appeal')}>
            {locale === 'ar' ? 'إنشاء استئناف' : 'Create appeal'}
          </Button>
        )}
      />

      <RejectionsSummary locale={locale} rejections={rejections} />
    </section>
  );
}

function ComplianceSection({
  locale,
  sectionRef,
  onAction,
  letters,
  overdueLetters,
}: Readonly<{
  locale: Locale;
  sectionRef: React.RefObject<HTMLElement>;
  onAction: (actionId: string) => void;
  letters: NormalizedLetter[];
  overdueLetters: number;
}>): JSX.Element {
  return (
    <section ref={sectionRef} data-section="compliance" className="space-y-6">
      <SectionHeading
        locale={locale}
        title={{ en: 'Regulatory compliance', ar: 'الامتثال التنظيمي' }}
        description={{
          en: 'Monitor letters, due dates, and NPHIES obligations in one workspace.',
          ar: 'راقب الخطابات والمواعيد النهائية والتزامات نفيس في لوحة واحدة.'
        }}
        action={(
          <Button size="sm" variant="secondary" onClick={() => onAction('compliance')}>
            {locale === 'ar' ? 'إصدار خطاب' : 'Issue letter'}
          </Button>
        )}
      />

      <ComplianceHighlights locale={locale} letters={letters} overdueCount={overdueLetters} />
    </section>
  );
}

function InsightsSection({
  locale,
  sectionRef,
  onAction,
  fraudAlerts,
}: Readonly<{
  locale: Locale;
  sectionRef: React.RefObject<HTMLElement>;
  onAction: (actionId: string) => void;
  fraudAlerts: Array<{
    id: string;
    description: string;
    severity: string;
    detectedAt: string | null;
    physician: string | null;
  }>;
}>): JSX.Element {
  return (
    <section ref={sectionRef} data-section="ai-insights" className="space-y-6">
      <SectionHeading
        locale={locale}
        title={{ en: 'AI insights & signals', ar: 'رؤى الذكاء الاصطناعي والتنبيهات' }}
        description={{
          en: 'Surface high-risk patterns and collaborate with data science in context.',
          ar: 'استخرج الأنماط عالية الخطورة وتعاون مع فريق البيانات في السياق.'
        }}
        action={(
          <Button size="sm" variant="ghost" onClick={() => onAction('fraud')}>
            {locale === 'ar' ? 'تشغيل كشف الاحتيال' : 'Run fraud analysis'}
          </Button>
        )}
      />

      <FraudAlertsPanel locale={locale} alerts={fraudAlerts} />
    </section>
  );
}

function AuditSection({
  locale,
  sectionRef,
  onAction,
  isHealthy,
  health,
  lastUpdated,
  onRefresh,
}: Readonly<{
  locale: Locale;
  sectionRef: React.RefObject<HTMLElement>;
  onAction: (actionId: string) => void;
  isHealthy: boolean;
  health: HealthStatus | null;
  lastUpdated: string;
  onRefresh: () => void;
}>): JSX.Element {
  return (
    <section ref={sectionRef} data-section="audit" className="space-y-6">
      <SectionHeading
        locale={locale}
        title={{ en: 'Audit & system health', ar: 'التدقيق وصحة الأنظمة' }}
        description={{
          en: 'Ensure traceability and platform readiness before executive reviews.',
          ar: 'ضمن تتبع الإجراءات واستعداد المنصة قبل اجتماعات الإدارة.'
        }}
        action={(
          <Button size="sm" variant="primary" onClick={() => onAction('audit')}>
            {locale === 'ar' ? 'عرض سجل المراجعة' : 'Open audit trail'}
          </Button>
        )}
      />

      <SystemStatusPanel locale={locale} isHealthy={isHealthy} health={health} lastSynced={lastUpdated} onRefresh={onRefresh} />
    </section>
  );
}

function SectionHeading({
  locale,
  title,
  description,
  action,
}: Readonly<{
  locale: Locale;
  title: { en: string; ar: string };
  description?: { en: string; ar: string };
  action?: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          {locale === 'ar' ? 'لوحة BrainSAIT' : 'BrainSAIT cockpit'}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          {translate(locale, title)}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-white/60 max-w-2xl">
            {translate(locale, description)}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

function SystemStatusPanel({
  locale,
  isHealthy,
  health,
  lastSynced,
  onRefresh,
}: Readonly<{
  locale: Locale;
  isHealthy: boolean;
  health: HealthStatus | null;
  lastSynced: string;
  onRefresh: () => void;
}>) {
  const stableLabel = translate(locale, { en: 'Platform stable', ar: 'النظام متصل' });
  const degradedLabel = translate(locale, { en: 'Platform degraded', ar: 'النظام متقطع' });
  const statusLabel = isHealthy ? stableLabel : degradedLabel;

  const databaseStatus = health?.database ?? (locale === 'ar' ? 'غير متوفر' : 'Unavailable');
  const apiStatus = health?.api ?? (locale === 'ar' ? 'غير متوفر' : 'Unavailable');
  const uptime = health?.uptime ?? null;

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 text-white">
            <span className={`h-3 w-3 rounded-full ${isHealthy ? 'bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.65)]' : 'bg-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.65)]'}`} />
            <span className="text-lg font-semibold">{statusLabel}</span>
          </div>
          <p className="mt-2 text-xs text-white/60">
            {locale === 'ar'
              ? 'آخر تزامن: ' + formatDateTime(lastSynced, locale)
              : 'Last sync: ' + formatDateTime(lastSynced, locale)}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          {locale === 'ar' ? 'تحقق الآن' : 'Re-run checks'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatusTile
          locale={locale}
          label={{ en: 'API connectivity', ar: 'اتصال الواجهة' }}
          value={String(apiStatus).toUpperCase()}
          tone={isHealthy ? 'success' : 'warning'}
        />
        <StatusTile
          locale={locale}
          label={{ en: 'Database', ar: 'قاعدة البيانات' }}
          value={String(databaseStatus).toUpperCase()}
          tone={databaseStatus === 'healthy' || databaseStatus === 'HEALTHY' ? 'success' : 'warning'}
        />
        <StatusTile
          locale={locale}
          label={{ en: 'Uptime', ar: 'الزمن التشغيلي' }}
          value={uptime ? String(uptime) : '—'}
          tone="info"
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <p>
          {locale === 'ar'
            ? 'احرص على تنزيل تقرير السجل قبل الاجتماعات أو زيارات التدقيق لضمان الشفافية.'
            : 'Export the latest audit trail before leadership reviews to maintain full traceability.'}
        </p>
      </div>
    </div>
  );
}

function StatusTile({
  locale,
  label,
  value,
  tone,
}: Readonly<{
  locale: Locale;
  label: { en: string; ar: string };
  value: string;
  tone: 'success' | 'warning' | 'info';
}>) {
  const toneStyles: Record<string, string> = {
    success: 'border-green-400/30 bg-green-400/10 text-green-200',
    warning: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
    info: 'border-brainsait-blue/30 bg-brainsait-blue/10 text-brainsait-cyan',
  };

  return (
    <div className={cn('rounded-xl border px-4 py-4', toneStyles[tone])}>
      <p className="text-xs uppercase tracking-wide text-white/60">
        {translate(locale, label)}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value || '—'}</p>
    </div>
  );
}

function MetricGrid({
  locale,
  totalClaims,
  totalBilled,
  totalRejected,
  rejectionRate,
  recoveryRate,
  overdueLetters,
  complianceWithin30,
}: Readonly<{
  locale: Locale;
  totalClaims: number;
  totalBilled: number;
  totalRejected: number;
  rejectionRate: number;
  recoveryRate: number;
  overdueLetters: number;
  complianceWithin30: number;
}>) {
  const currentMonthLabel = translate(locale, { en: 'current month', ar: 'الشهر الحالي' });
  const billedHelper = translate(locale, { en: 'including VAT', ar: 'شامل الضريبة' });
  const rejectedHelper = translate(locale, { en: 'under dispute', ar: 'قيد الجدل' });
  const rejectionTargetLabel = translate(locale, { en: 'target 15%', ar: 'هدف 15%' });
  const recoveryHelper = translate(locale, { en: 'of appealed claims', ar: 'من المطالبات المستأنفة' });
  const overdueNeedsEscalation = translate(locale, { en: 'needs escalation', ar: 'تحتاج التحرك' });
  const overdueOnTime = translate(locale, { en: 'all on time', ar: 'جميعها ضمن الوقت' });
  const responsesHelper = translate(locale, { en: 'NPHIES compliance', ar: 'التزام نفيس' });

  const cards = [
    {
      title: translate(locale, { en: 'Total claims', ar: 'إجمالي المطالبات' }),
      value: totalClaims.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US'),
      accent: 'text-brainsait-cyan',
      helper: currentMonthLabel,
      icon: '📊',
    },
    {
      title: translate(locale, { en: 'Total billed', ar: 'إجمالي الفواتير' }),
      value: formatCurrency(totalBilled, locale),
      accent: 'text-emerald-300',
      helper: billedHelper,
      icon: '💳',
    },
    {
      title: translate(locale, { en: 'Rejected value', ar: 'المبالغ المرفوضة' }),
      value: formatCurrency(totalRejected, locale),
      accent: 'text-orange-300',
      helper: rejectedHelper,
      icon: '⚠️',
    },
    {
      title: translate(locale, { en: 'Rejection rate', ar: 'نسبة الرفض' }),
      value: `${rejectionRate.toFixed(1)}%`,
      accent: rejectionRate > 20 ? 'text-red-400' : 'text-yellow-300',
      helper: rejectionTargetLabel,
      icon: '📉',
    },
    {
      title: translate(locale, { en: 'Recovery rate', ar: 'نسبة الاسترداد' }),
      value: `${recoveryRate.toFixed(1)}%`,
      accent: 'text-green-400',
      helper: recoveryHelper,
      icon: '💡',
    },
    {
      title: translate(locale, { en: 'Overdue letters', ar: 'خطابات متأخرة' }),
      value: overdueLetters.toString(),
      accent: overdueLetters > 0 ? 'text-red-400' : 'text-green-400',
      helper: overdueLetters > 0 ? overdueNeedsEscalation : overdueOnTime,
      icon: '📬',
    },
    {
      title: translate(locale, { en: 'Responses <30d', ar: 'ردود في 30 يوم' }),
      value: complianceWithin30.toString(),
      accent: 'text-sky-300',
      helper: responsesHelper,
      icon: '⏱️',
    },
  ];

  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <motion.div
          key={card.title}
          whileHover={{ y: -6 }}
          className="glass-morphism rounded-2xl p-5 h-full flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">{card.icon}</div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">{card.title}</p>
              <p className={`text-2xl font-semibold ${card.accent}`}>{card.value}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{card.helper}</p>
        </motion.div>
      ))}
    </div>
  );
}

function TrendCard({
  locale,
  points,
  sparkline,
  loading,
}: Readonly<{
  locale: Locale;
  points: TrendPoint[];
  sparkline: SparklineGeometry | null;
  loading: boolean;
}>) {
  const lastPoint = points[points.length - 1];
  const positiveTrend = points.length > 1 && lastPoint && lastPoint.count <= points[0].count;
  const downwardLabel = translate(locale, { en: 'Downward', ar: 'انخفاض' });
  const upwardLabel = translate(locale, { en: 'Upward', ar: 'تصاعدي' });
  const chartContent = renderTrendChartContent(locale, loading, sparkline, points);
  const detailItems = useMemo(() => {
    const items: Array<{ key: string; label: string; value: string }> = [
      {
        key: 'date',
        label: locale === 'ar' ? 'آخر تحديث' : 'Last point',
        value: lastPoint ? formatDate(lastPoint.date, locale) : '—',
      },
      {
        key: 'claims',
        label: locale === 'ar' ? 'مطالبات' : 'Claims',
        value:
          lastPoint && Number.isFinite(lastPoint.count)
            ? formatNumberValue(lastPoint.count, locale)
            : '—',
      },
    ];

    if (typeof lastPoint?.recoveryRate === 'number' && Number.isFinite(lastPoint.recoveryRate)) {
      items.push({
        key: 'recovery',
        label: locale === 'ar' ? 'نسبة الاسترداد' : 'Recovery rate',
        value: formatPercentValue(lastPoint.recoveryRate, locale),
      });
    }

    if (typeof lastPoint?.complianceRate === 'number' && Number.isFinite(lastPoint.complianceRate)) {
      items.push({
        key: 'compliance',
        label: locale === 'ar' ? 'التزام 30 يوم' : '30d compliance',
        value: formatPercentValue(lastPoint.complianceRate, locale),
      });
    }

    if (typeof lastPoint?.alertsCount === 'number' && Number.isFinite(lastPoint.alertsCount)) {
      items.push({
        key: 'alerts',
        label: locale === 'ar' ? 'تنبيهات احتيال' : 'Fraud alerts',
        value: formatNumberValue(lastPoint.alertsCount, locale),
      });
    }

    return items;
  }, [lastPoint, locale]);

  return (
    <div className="glass-morphism rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {locale === 'ar' ? 'اتجاهات الرفض' : 'Rejection trends'}
          </h3>
          <p className="text-sm text-gray-400">
            {locale === 'ar' ? 'آخر 14 يومًا' : 'Last 14 days'}
          </p>
        </div>
        <span className={`text-sm font-semibold ${positiveTrend ? 'text-green-400' : 'text-red-400'}`}>
          {positiveTrend ? downwardLabel : upwardLabel}
        </span>
      </div>

      <div className="relative h-40">
        {chartContent}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-300">
        {detailItems.map((item) => (
          <div key={item.key}>
            <p className="uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className="font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderTrendChartContent(
  locale: Locale,
  loading: boolean,
  sparkline: SparklineGeometry | null,
  points: TrendPoint[],
): ReactNode {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        {translate(locale, { en: 'Analyzing trends...', ar: 'جاري تحليل الاتجاهات...' })}
      </div>
    );
  }

  if (sparkline) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(14,165,233,0.7)" />
            <stop offset="100%" stopColor="rgba(91,33,182,0.0)" />
          </linearGradient>
        </defs>
        <path
          d={`${sparkline.path} L100,100 L0,100 Z`}
          fill="url(#spark)"
          stroke="none"
        />
        <path
          d={sparkline.path}
          fill="none"
          stroke="rgba(14,165,233,0.9)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const message = points.length === 0
    ? translate(locale, { en: 'No trend data available', ar: 'لا توجد بيانات اتجاه' })
    : translate(locale, { en: 'Not enough data', ar: 'بيانات غير كافية' });

  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {message}
    </div>
  );
}

function QuickActionPanel({
  locale,
  onAction,
}: Readonly<{
  locale: Locale;
  onAction: (actionId: string) => void;
}>) {
  return (
    <Card locale={locale} variant="glass" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-white">
          {locale === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
        </CardTitle>
        <CardDescription className="text-xs text-gray-300">
          {locale === 'ar'
            ? 'ابدأ بعملية جديدة أو انتقل مباشرةً إلى المهام اليومية'
            : 'Kick off a new request or jump straight into your daily workflows.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <div className="grid grid-cols-2 gap-3 h-full">
          {ACTIONS.map((action) => (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onAction(action.id)}
              className="group relative flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-left text-sm text-gray-200 transition hover:border-white/35 hover:bg-white/10"
            >
              <span className="text-2xl text-brainsait-cyan">{action.icon}</span>
              <span className="font-semibold text-white leading-tight">{translate(locale, action.label)}</span>
              <span className="text-xs text-gray-400 leading-snug">
                {locale === 'ar' ? 'يرسل طلبًا مباشرًا لواجهة البرمجة' : 'Executes live API workflow'}
              </span>
              <div className="absolute inset-y-0 end-3 flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                <Badge tone="info" locale={locale} className="text-[11px]">
                  {locale === 'ar' ? 'ابدأ' : 'Start'}
                </Badge>
              </div>
            </motion.button>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2 text-[11px] uppercase tracking-wide text-gray-400">
        {locale === 'ar' ? 'تكامل مباشر مع واجهات برمجة التطبيقات' : 'Live API integrations'}
      </CardFooter>
    </Card>
  );
}

function RejectionsSummary({
  locale,
  rejections,
}: Readonly<{
  locale: Locale;
  rejections: NormalizedRejection[];
}>) {
  return (
    <div className="glass-morphism rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {locale === 'ar' ? 'أحدث المطالبات المرفوضة' : 'Latest rejected claims'}
        </h3>
        <span className="text-xs text-gray-400">
          {locale === 'ar' ? 'أحدث 6 سجلات' : 'Most recent 6 records'}
        </span>
      </div>

      {rejections.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          {locale === 'ar' ? 'لا توجد مطالبات مرفوضة لهذا الشهر.' : 'No rejected claims for this month.'}
        </div>
      ) : (
        <div className="space-y-4">
          {rejections.map((rejection) => (
            <div key={rejection.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-white/5 rounded-xl px-4 py-3 bg-white/5">
              <div>
                <p className="text-sm font-semibold text-white">#{rejection.claimId}</p>
                <p className="text-xs text-gray-400">
                  {rejection.insuranceCompany} • {rejection.tpaName}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge>
                  {formatCurrency(rejection.rejectedTotal, locale)}
                </Badge>
                <Badge tone="muted">
                  {formatDate(rejection.rejectionDate, locale)}
                </Badge>
                <Badge tone={rejection.status === 'RECOVERED' ? 'success' : 'warning'}>
                  {translateStatus(rejection.status, locale)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComplianceHighlights({
  locale,
  letters,
  overdueCount,
}: Readonly<{
  locale: Locale;
  letters: NormalizedLetter[];
  overdueCount: number;
}>) {
  const localeKey = resolveLocaleKey(locale);
  return (
    <div className="glass-morphism rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {locale === 'ar' ? 'خطابات الامتثال' : 'Compliance letters'}
        </h3>
        <Badge tone={overdueCount > 0 ? 'warning' : 'success'}>
          {overdueCount > 0
            ? `${overdueCount} ${translate(locale, { en: 'overdue', ar: 'متأخرة' })}`
            : translate(locale, { en: 'On schedule', ar: 'لا تأخير' })}
        </Badge>
      </div>

      {letters.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          {locale === 'ar' ? 'لم يتم إصدار خطابات امتثال جديدة.' : 'No new compliance letters issued.'}
        </div>
      ) : (
        <div className="space-y-4">
          {letters.map((letter) => {
            const subject =
              typeof letter.subject === 'string'
                ? letter.subject
                : letter.subject?.[localeKey] ?? letter.subject?.en ?? letter.subject?.ar;

            return (
              <div key={letter.id} className="border border-white/5 rounded-xl px-4 py-4 bg-white/5">
                <p className="text-sm font-semibold text-white mb-1">{subject ?? '—'}</p>
                <p className="text-xs text-gray-400 mb-2">
                  {locale === 'ar' ? 'إلى: ' : 'To: '}
                  {letter.recipient}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
                  <Badge tone="muted">
                    {locale === 'ar' ? 'الاستحقاق' : 'Due'}: {formatDate(letter.dueDate, locale)}
                  </Badge>
                  {typeof letter.totalAmount === 'number' ? (
                    <Badge tone="info">{formatCurrency(letter.totalAmount, locale)}</Badge>
                  ) : null}
                  {letter.daysOverdue && letter.daysOverdue > 0 ? (
                    <Badge tone="warning">
                      {letter.daysOverdue} {locale === 'ar' ? 'يوم متأخر' : 'days late'}
                    </Badge>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FraudAlertsPanel({
  locale,
  alerts,
}: Readonly<{
  locale: Locale;
  alerts: {
    id: string;
    description: string;
    severity: string;
    detectedAt: string | null;
    physician: string | null;
  }[];
}>) {
  return (
    <div className="glass-morphism rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {locale === 'ar' ? 'تنبيهات الاحتيال الأخيرة' : 'Recent fraud alerts'}
        </h3>
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {locale === 'ar' ? 'ذكاء اصطناعي' : 'AI powered'}
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          {locale === 'ar' ? 'لا توجد تنبيهات مسجلة.' : 'No alerts recorded.'}
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="border border-white/5 rounded-xl px-4 py-4 bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge tone={severityTone(alert.severity)}>{translateSeverity(alert.severity, locale)}</Badge>
                  <p className="text-sm text-white mt-2">{alert.description}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>{alert.physician ?? '—'}</div>
                  <div>{formatDate(alert.detectedAt, locale)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarMetric({
  title,
  value,
  accent,
}: Readonly<{
  title: string;
  value: string;
  accent: string;
}>) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{title}</p>
      <p className={`text-lg font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function LocaleToggle({
  locale,
  onChange,
}: Readonly<{
  locale: Locale;
  onChange?: (locale: Locale) => void;
}>) {
  if (!onChange) {
    return null;
  }

  return (
    <div className="flex items-center rounded-full bg-white/10 p-1 text-xs">
      <button
        onClick={() => onChange('en')}
        className={`px-3 py-1 rounded-full transition ${locale === 'en' ? 'bg-white text-black' : 'text-gray-300'}`}
      >
        EN
      </button>
      <button
        onClick={() => onChange('ar')}
        className={`px-3 py-1 rounded-full transition ${locale === 'ar' ? 'bg-white text-black' : 'text-gray-300'}`}
      >
        AR
      </button>
    </div>
  );
}

function HealthBadge({
  isHealthy,
  locale,
  databaseStatus,
}: Readonly<{
  isHealthy: boolean;
  locale: Locale;
  databaseStatus?: string;
}>) {
  const healthyLabel = translate(locale, { en: 'Service healthy', ar: 'الخدمة متاحة' });
  const degradedLabel = translate(locale, { en: 'Service degraded', ar: 'الخدمة متقطعة' });
  const label = isHealthy ? healthyLabel : degradedLabel;
  const databaseLabel = translate(locale, { en: 'DB', ar: 'قاعدة البيانات' });
  const db = databaseStatus ? `${databaseLabel}: ${databaseStatus}` : '';

  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-full border ${isHealthy ? 'border-green-400/40 text-green-300' : 'border-orange-400/40 text-orange-300'} bg-black/20`}> 
      <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.8)]' : 'bg-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.8)]'}`} />
      <span className="font-semibold">{label}</span>
      {db ? <span className="hidden sm:inline">• {db}</span> : null}
    </div>
  );
}

function formatCurrency(amount: number, locale: Locale): string {
  if (!amount && amount !== 0) return '—';
  const formatted = amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return locale === 'ar' ? `${formatted} ر.س` : `SAR ${formatted}`;
}

function formatDate(value: string | Date | undefined | null, locale: Locale): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: string | Date, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function translateRole(role: UserRole, locale: Locale): string {
  const localeKey = resolveLocaleKey(locale);
  const dictionary: Record<UserRole, { en: string; ar: string }> = {
    ADMIN: { en: 'Administrator', ar: 'مدير النظام' },
    MANAGER: { en: 'Operations Manager', ar: 'مدير العمليات' },
    ANALYST: { en: 'Claims Analyst', ar: 'محلل المطالبات' },
  };
  const entry = dictionary[role];
  if (!entry) {
    return role;
  }
  return entry[localeKey] ?? entry.en;
}

function translateStatus(status: string, locale: Locale): string {
  const localeKey = resolveLocaleKey(locale);
  const normalized = status?.toUpperCase?.() ?? status;
  const map: Record<string, { en: string; ar: string }> = {
    RECOVERED: { en: 'Recovered', ar: 'تم الاسترداد' },
    PENDING_REVIEW: { en: 'Pending review', ar: 'بانتظار المراجعة' },
    UNDER_APPEAL: { en: 'Under appeal', ar: 'قيد الاستئناف' },
    FINAL_REJECTION: { en: 'Final rejection', ar: 'مرفوض نهائيًا' },
    NON_APPEALABLE: { en: 'Non-appealable', ar: 'غير قابل للاستئناف' },
  };
  const entry = map[normalized];
  if (!entry) {
    return status;
  }
  return entry[localeKey] ?? entry.en;
}

function translateSeverity(severity: string, locale: Locale): string {
  const localeKey = resolveLocaleKey(locale);
  const normalized = severity?.toUpperCase?.() ?? severity;
  const map: Record<string, { en: string; ar: string }> = {
    LOW: { en: 'Low', ar: 'منخفض' },
    MEDIUM: { en: 'Medium', ar: 'متوسط' },
    HIGH: { en: 'High', ar: 'مرتفع' },
    CRITICAL: { en: 'Critical', ar: 'حرج' },
  };
  const entry = map[normalized];
  if (!entry) {
    return severity;
  }
  return entry[localeKey] ?? entry.en;
}

function severityTone(severity: string): 'info' | 'warning' | 'success' | 'muted' {
  const normalized = severity?.toUpperCase?.();
  if (normalized === 'CRITICAL' || normalized === 'HIGH') return 'warning';
  if (normalized === 'MEDIUM') return 'info';
  if (normalized === 'LOW') return 'muted';
  return 'info';
}

function createSeriesLookup(points: DashboardMetricSeriesPoint[]): Map<string, DashboardMetricSeriesPoint> {
  const lookup = new Map<string, DashboardMetricSeriesPoint>();

  const register = (key: string, point: DashboardMetricSeriesPoint) => {
    if (!key) {
      return;
    }
    const existing = lookup.get(key);
    if (!existing) {
      lookup.set(key, point);
      return;
    }

    const currentValue = typeof existing.value === 'number' ? existing.value : undefined;
    const nextValue = typeof point.value === 'number' ? point.value : undefined;

    if (typeof nextValue === 'number' && (!currentValue || nextValue >= currentValue)) {
      lookup.set(key, point);
    }
  };

  points.forEach((point) => {
    const key = resolveSeriesKey(point);
    if (key) {
      register(key, point);
    }

    const dayKey = resolveSeriesDayKey(point);
    if (dayKey && dayKey !== key) {
      register(dayKey, point);
    }
  });

  return lookup;
}

function resolveSeriesKey(point: DashboardMetricSeriesPoint): string {
  if (typeof point.ts === 'number' && Number.isFinite(point.ts)) {
    return String(point.ts);
  }
  if (typeof point.timestamp === 'string' && point.timestamp.trim().length > 0) {
    return point.timestamp;
  }
  return '';
}

function resolveSeriesDayKey(point: DashboardMetricSeriesPoint): string {
  if (typeof point.ts === 'number' && Number.isFinite(point.ts)) {
    const date = new Date(point.ts);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  if (typeof point.timestamp === 'string' && point.timestamp.trim().length >= 10) {
    return point.timestamp.slice(0, 10);
  }
  return '';
}

function resolveSeriesDate(point: DashboardMetricSeriesPoint): string {
  if (typeof point.timestamp === 'string' && point.timestamp.trim().length > 0) {
    return point.timestamp;
  }

  if (typeof point.ts === 'number' && Number.isFinite(point.ts)) {
    const date = new Date(point.ts);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

function resolveLookupValue(
  lookup: Map<string, DashboardMetricSeriesPoint>,
  key: string,
): number | undefined {
  const byKey = lookup.get(key);
  if (byKey && typeof byKey.value === 'number' && Number.isFinite(byKey.value)) {
    return byKey.value;
  }

  const fallbackKey = key.slice(0, 10);
  if (fallbackKey && fallbackKey !== key) {
    const byDay = lookup.get(fallbackKey);
    if (byDay && typeof byDay.value === 'number' && Number.isFinite(byDay.value)) {
      return byDay.value;
    }
  }

  return undefined;
}

function formatNumberValue(value: number, locale: Locale): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    maximumFractionDigits: 0,
  });
}

function formatPercentValue(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

function normalizeRejectionRecord(record: DashboardRejectionRecord): NormalizedRejection {
  return {
    id: stringifyId(record),
    claimId: record.claim_id ?? record.claimId ?? record.id ?? '—',
    tpaName: record.tpa_name ?? record.tpaName ?? '—',
    insuranceCompany: record.insurance_company ?? record.insuranceCompany ?? '—',
    branch: record.branch ?? '—',
    receptionMode: record.reception_mode ?? record.receptionMode ?? '—',
    billedTotal: record.billed_amount?.total ?? record.billedAmount?.total ?? 0,
    rejectedTotal: record.rejected_amount?.total ?? record.rejectedAmount?.total ?? 0,
    status: record.status ?? 'PENDING_REVIEW',
    rejectionDate: record.rejection_received_date ?? record.rejectionReceivedDate ?? undefined,
    within30Days: record.within_30_days ?? record.within30Days ?? undefined,
  };
}

function normalizeLetter(letter: DashboardComplianceLetter): NormalizedLetter {
  return {
    id: stringifyId(letter),
    recipient: letter.recipient ?? '—',
    dueDate: letter.due_date ?? letter.dueDate ?? undefined,
    daysOverdue: letter.days_overdue ?? letter.daysOverdue ?? undefined,
    subject: letter.subject,
    totalAmount: letter.total_amount ?? letter.totalAmount ?? undefined,
    claimReferences: letter.claim_references ?? letter.claimReferences ?? [],
  };
}

function stringifyId(entity: unknown): string {
  if (typeof entity === 'string') {
    return entity;
  }

  if (entity && typeof entity === 'object') {
    const reference = (entity as Record<string, unknown>).reference;
    const id = (entity as Record<string, unknown>).id;
    const rawMongoId = (entity as Record<string, unknown>)._id;

    if (typeof rawMongoId === 'string') {
      return rawMongoId;
    }

    if (rawMongoId && typeof rawMongoId === 'object') {
      const mongoObject = rawMongoId as Record<string, unknown>;
      if (typeof mongoObject.$oid === 'string') {
        return mongoObject.$oid;
      }
    }

    if (typeof id === 'string') {
      return id;
    }

    if (typeof reference === 'string') {
      return reference;
    }
  }

  return Math.random().toString(36).slice(2);
}

type LocaleKey = 'en' | 'ar';

function resolveLocaleKey(locale: Locale): LocaleKey {
  if (typeof locale === 'string' && locale.toLowerCase().startsWith('ar')) {
    return 'ar';
  }
  return 'en';
}

function translate(locale: Locale, text: Readonly<{ en: string; ar: string }>): string {
  const localeKey = resolveLocaleKey(locale);
  return text[localeKey] ?? text.en;
}
