'use client';

import { useMemo, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Locale, UserRole } from '@brainsait/rejection-tracker';
import { useDashboardData, useTrends, useHealthCheck } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { CreateRejectionModal } from './CreateRejectionModal';
import { CreateAppealModal } from './CreateAppealModal';
import { FraudDetectionModal } from './FraudDetectionModal';
import { PredictiveAnalyticsModal } from './PredictiveAnalyticsModal';
import { WhatsAppModal } from './WhatsAppModal';
import { ComplianceLetterModal } from './ComplianceLetterModal';
import { NPHIESModal } from './NPHIESModal';
import { AuditTrailModal } from './AuditTrailModal';
import { Button } from './ui/Button';

interface DashboardProps {
  userRole: UserRole;
  locale: Locale;
  userName?: string;
  onLocaleChange?: (locale: Locale) => void;
}

interface TrendPoint {
  date: string;
  count: number;
  rejectedAmount: number;
  recoveredCount: number;
}

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
  subject?: { ar?: string; en?: string };
  totalAmount?: number;
  claimReferences?: string[];
}

const NAV_ITEMS = [
  { id: 'overview', icon: '🧭', label: { en: 'Overview', ar: 'نظرة عامة' } },
  { id: 'claims', icon: '📑', label: { en: 'Claims', ar: 'المطالبات' } },
  { id: 'compliance', icon: '📋', label: { en: 'Compliance', ar: 'الالتزام' } },
  { id: 'ai-insights', icon: '🧠', label: { en: 'AI Insights', ar: 'تحليلات الذكاء الاصطناعي' } },
  { id: 'audit', icon: '🛡️', label: { en: 'Audit Trail', ar: 'سجل المراجعة' } },
];

const ACTIONS = [
  { id: 'rejection', icon: '➕', label: { en: 'Add Rejection', ar: 'إضافة مرفوض' } },
  { id: 'appeal', icon: '📝', label: { en: 'Create Appeal', ar: 'إنشاء استئناف' } },
  { id: 'fraud', icon: '🔍', label: { en: 'Fraud Detection', ar: 'كشف الاحتيال' } },
  { id: 'predict', icon: '📈', label: { en: 'Predictive Analytics', ar: 'تحليلات تنبؤية' } },
  { id: 'compliance', icon: '📄', label: { en: 'Compliance Letter', ar: 'خطاب امتثال' } },
  { id: 'nphies', icon: '🏥', label: { en: 'NPHIES Submit', ar: 'تقديم NPHIES' } },
  { id: 'whatsapp', icon: '💬', label: { en: 'WhatsApp Notice', ar: 'إشعار واتساب' } },
  { id: 'audit', icon: '🛡️', label: { en: 'Audit Trail', ar: 'سجل المراجعة' } },
];

export function RejectionDashboard({ userRole, locale, userName, onLocaleChange }: Readonly<DashboardProps>) {
  const { data, loading, error, refetch } = useDashboardData();
  const { trends, loading: trendsLoading } = useTrends(60);
  const { isHealthy, health } = useHealthCheck();

  const [showCreateRejection, setShowCreateRejection] = useState(false);
  const [showCreateAppeal, setShowCreateAppeal] = useState(false);
  const [showFraudDetection, setShowFraudDetection] = useState(false);
  const [showPredictiveAnalytics, setShowPredictiveAnalytics] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showComplianceLetter, setShowComplianceLetter] = useState(false);
  const [showNPHIES, setShowNPHIES] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [activeNav, setActiveNav] = useState<string>('overview');

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
    }
  }, []);

  const actionHandlers = useMemo(
    () => ({
      rejection: () => setShowCreateRejection(true),
      appeal: () => setShowCreateAppeal(true),
      fraud: () => setShowFraudDetection(true),
      predict: () => setShowPredictiveAnalytics(true),
      compliance: () => setShowComplianceLetter(true),
      nphies: () => setShowNPHIES(true),
      whatsapp: () => setShowWhatsApp(true),
      audit: () => setShowAuditTrail(true),
    }),
    [
      setShowCreateRejection,
      setShowCreateAppeal,
      setShowFraudDetection,
      setShowPredictiveAnalytics,
      setShowComplianceLetter,
      setShowNPHIES,
      setShowWhatsApp,
      setShowAuditTrail,
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
    return (data?.analytics?.recent_alerts ?? []).map((alert: any) => ({
      id: alert._id ?? alert.id ?? alert.reference ?? Math.random().toString(36).slice(2),
      description: alert.description ?? alert.details ?? '—',
      severity: alert.severity ?? 'MEDIUM',
      detectedAt: alert.detected_at ?? alert.detectedAt ?? alert.created_at ?? null,
      physician: alert.physician_name ?? alert.physician ?? null,
    })).slice(0, 5);
  }, [data?.analytics?.recent_alerts]);

  const trendPoints = useMemo<TrendPoint[]>(() => {
    if (!trends?.daily_trends) return [];
    return Object.entries(trends.daily_trends)
      .map(([dateKey, stats]) => {
        const details = (stats ?? {}) as {
          count?: number;
          rejected_amount?: number;
          rejectedAmount?: number;
          recovered_count?: number;
          recoveredCount?: number;
        };

        return {
          date: dateKey,
          count: details.count ?? 0,
          rejectedAmount: details.rejected_amount ?? details.rejectedAmount ?? 0,
          recoveredCount: details.recovered_count ?? details.recoveredCount ?? 0,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
  }, [trends?.daily_trends]);

  const sparklinePath = useMemo(() => buildSparklinePath(trendPoints), [trendPoints]);

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
        isHealthy={isHealthy}
        health={health}
        activeNav={activeNav}
        onNavigate={handleNavClick}
        sectionRefs={{
          overview: overviewRef,
          claims: claimsRef,
          compliance: complianceRef,
          insights: insightsRef,
          audit: auditRef,
        }}
        metrics={metricsSummary}
        normalizedRejections={normalizedRejections}
        normalizedLetters={normalizedLetters}
        fraudAlerts={fraudAlerts}
        trendPoints={trendPoints}
        sparklinePath={sparklinePath}
        trendsLoading={trendsLoading}
        lastUpdated={data?.analytics?.updated_at ?? new Date().toISOString()}
        onRefresh={refetch}
        onAction={triggerAction}
        showMobileActions={showMobileActions}
        onToggleMobileActions={toggleMobileActions}
        onCloseMobileActions={closeMobileActions}
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
          nphies: () => setShowNPHIES(false),
          auditTrail: () => setShowAuditTrail(false),
        }}
        onSuccess={refetch}
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
  isHealthy,
  health,
  activeNav,
  onNavigate,
  sectionRefs,
  metrics,
  normalizedRejections,
  normalizedLetters,
  fraudAlerts,
  trendPoints,
  sparklinePath,
  trendsLoading,
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
  isHealthy: boolean;
  health: any;
  activeNav: string;
  onNavigate: (sectionId: string) => void;
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
  sparklinePath: string;
  trendsLoading: boolean;
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
        <aside className="hidden lg:flex lg:w-72 xl:w-80 flex-col border-r border-white/10 bg-white/5/60 backdrop-blur-xl">
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
                  'w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition border border-transparent',
                  activeNav === item.id
                    ? 'bg-white/15 text-white border-white/25 shadow-glow'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label[locale]}</span>
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
          <header className="px-4 sm:px-6 py-4 border-b border-white/10 bg-white/5/70 backdrop-blur-xl flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-400">
                {locale === 'ar' ? 'لوحة إدارة المطالبات' : 'Claims operations cockpit'}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white">
                {locale === 'ar' ? 'مرحباً' : 'Welcome'}, {userName ?? (locale === 'ar' ? 'فريق المطالبات' : 'Claims Team')} 👋
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <HealthBadge isHealthy={isHealthy} locale={locale} databaseStatus={health?.database} />
              <LocaleToggle locale={locale} onChange={onLocaleChange} />
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
          </header>

          <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-24 sm:pb-10">
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
                sparklinePath={sparklinePath}
                trendsLoading={trendsLoading}
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
                  <span>{action.label[locale]}</span>
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
  sparklinePath,
  trendsLoading,
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
  sparklinePath: string;
  trendsLoading: boolean;
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
          sparklinePath={sparklinePath}
          loading={trendsLoading}
        />
        <QuickActionPanel locale={locale} onAction={onAction} />
      </div>
    </section>
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
  health: any;
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
          {title[locale] ?? title.en}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-white/60 max-w-2xl">
            {description[locale] ?? description.en}
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
  health: any;
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
        {label[locale] ?? label.en}
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
  sparklinePath,
  loading,
}: Readonly<{
  locale: Locale;
  points: TrendPoint[];
  sparklinePath: string;
  loading: boolean;
}>) {
  const lastPoint = points[points.length - 1];
  const positiveTrend = points.length > 1 && lastPoint && lastPoint.count <= points[0].count;
  const downwardLabel = translate(locale, { en: 'Downward', ar: 'انخفاض' });
  const upwardLabel = translate(locale, { en: 'Upward', ar: 'تصاعدي' });
  const chartContent = renderTrendChartContent(locale, loading, sparklinePath, points);

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
        <div>
          <p className="uppercase tracking-wide text-gray-500">
            {locale === 'ar' ? 'آخر تحديث' : 'Last point'}
          </p>
          <p className="font-semibold text-white">
            {lastPoint ? formatDate(lastPoint.date, locale) : '—'}
          </p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-gray-500">
            {locale === 'ar' ? 'مطالبات' : 'Claims'}
          </p>
          <p className="font-semibold text-white">{lastPoint ? lastPoint.count : '—'}</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-gray-500">
            {locale === 'ar' ? 'قيمة مرفوضة' : 'Rejected'}
          </p>
          <p className="font-semibold text-white">
            {lastPoint ? formatCurrency(lastPoint.rejectedAmount, locale) : '—'}
          </p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-gray-500">
            {locale === 'ar' ? 'استرداد' : 'Recovered'}
          </p>
          <p className="font-semibold text-white">{lastPoint ? lastPoint.recoveredCount : '—'}</p>
        </div>
      </div>
    </div>
  );
}

function renderTrendChartContent(
  locale: Locale,
  loading: boolean,
  sparklinePath: string,
  points: TrendPoint[],
): ReactNode {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        {translate(locale, { en: 'Analyzing trends...', ar: 'جاري تحليل الاتجاهات...' })}
      </div>
    );
  }

  if (points.length >= 2) {
    return (
      <svg viewBox="0 0 220 100" className="w-full h-full">
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(14,165,233,0.7)" />
            <stop offset="100%" stopColor="rgba(91,33,182,0.0)" />
          </linearGradient>
        </defs>
        <path
          d={`${sparklinePath} L220 100 L0 100 Z`}
          fill="url(#spark)"
          stroke="none"
        />
        <path
          d={sparklinePath}
          fill="none"
          stroke="rgba(14,165,233,0.9)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {translate(locale, { en: 'Not enough data', ar: 'بيانات غير كافية' })}
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
    <div className="glass-morphism rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {locale === 'ar' ? 'إجراءات فورية' : 'Quick actions'}
        </h3>
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {locale === 'ar' ? 'تكامل مع الواجهة الخلفية' : 'Backend connected'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {ACTIONS.map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onAction(action.id)}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-4 text-left text-sm text-gray-200 hover:bg-white/15 transition"
          >
            <div className="text-2xl mb-3">{action.icon}</div>
            <div className="font-semibold text-white">{action.label[locale]}</div>
            <div className="text-xs text-gray-400 mt-1">
              {locale === 'ar' ? 'يرسل طلبًا مباشرًا لواجهة البرمجة' : 'Executes live API workflow'}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
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
          {letters.map((letter) => (
            <div key={letter.id} className="border border-white/5 rounded-xl px-4 py-4 bg-white/5">
              <p className="text-sm font-semibold text-white mb-1">
                {letter.subject?.[locale] ?? letter.subject?.en ?? letter.subject?.ar ?? '—'}
              </p>
              <p className="text-xs text-gray-400 mb-2">
                {locale === 'ar' ? 'إلى: ' : 'To: '}
                {letter.recipient}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
                <Badge tone="muted">
                  {locale === 'ar' ? 'الاستحقاق' : 'Due'}: {formatDate(letter.dueDate, locale)}
                </Badge>
                {letter.totalAmount ? (
                  <Badge tone="info">{formatCurrency(letter.totalAmount, locale)}</Badge>
                ) : null}
                {letter.daysOverdue && letter.daysOverdue > 0 ? (
                  <Badge tone="warning">
                    {letter.daysOverdue} {locale === 'ar' ? 'يوم متأخر' : 'days late'}
                  </Badge>
                ) : null}
              </div>
            </div>
          ))}
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

function Badge({
  children,
  tone = 'info',
}: Readonly<{
  children: ReactNode;
  tone?: 'info' | 'warning' | 'success' | 'muted';
}>) {
  const toneStyles: Record<string, string> = {
    info: 'bg-brainsait-blue/20 text-brainsait-cyan border-brainsait-blue/30',
    warning: 'bg-orange-500/20 text-orange-200 border-orange-400/30',
    success: 'bg-green-500/20 text-green-200 border-green-400/30',
    muted: 'bg-white/10 text-gray-200 border-white/10',
  };

  return (
    <span className={`px-3 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${toneStyles[tone] ?? toneStyles.info}`}>
      {children}
    </span>
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
  const dictionary: Record<UserRole, { en: string; ar: string }> = {
    ADMIN: { en: 'Administrator', ar: 'مدير النظام' },
    MANAGER: { en: 'Operations Manager', ar: 'مدير العمليات' },
    ANALYST: { en: 'Claims Analyst', ar: 'محلل المطالبات' },
  };
  return dictionary[role]?.[locale] ?? role;
}

function translateStatus(status: string, locale: Locale): string {
  const normalized = status?.toUpperCase?.() ?? status;
  const map: Record<string, { en: string; ar: string }> = {
    RECOVERED: { en: 'Recovered', ar: 'تم الاسترداد' },
    PENDING_REVIEW: { en: 'Pending review', ar: 'بانتظار المراجعة' },
    UNDER_APPEAL: { en: 'Under appeal', ar: 'قيد الاستئناف' },
    FINAL_REJECTION: { en: 'Final rejection', ar: 'مرفوض نهائيًا' },
    NON_APPEALABLE: { en: 'Non-appealable', ar: 'غير قابل للاستئناف' },
  };
  return map[normalized]?.[locale] ?? status;
}

function translateSeverity(severity: string, locale: Locale): string {
  const normalized = severity?.toUpperCase?.() ?? severity;
  const map: Record<string, { en: string; ar: string }> = {
    LOW: { en: 'Low', ar: 'منخفض' },
    MEDIUM: { en: 'Medium', ar: 'متوسط' },
    HIGH: { en: 'High', ar: 'مرتفع' },
    CRITICAL: { en: 'Critical', ar: 'حرج' },
  };
  return map[normalized]?.[locale] ?? severity;
}

function severityTone(severity: string): 'info' | 'warning' | 'success' | 'muted' {
  const normalized = severity?.toUpperCase?.();
  if (normalized === 'CRITICAL' || normalized === 'HIGH') return 'warning';
  if (normalized === 'MEDIUM') return 'info';
  if (normalized === 'LOW') return 'muted';
  return 'info';
}

function buildSparklinePath(points: TrendPoint[]): string {
  if (points.length < 2) return '';
  const width = 220;
  const height = 100;
  const maxCount = Math.max(...points.map((p) => p.count), 1);

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - (point.count / maxCount) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function normalizeRejectionRecord(record: any): NormalizedRejection {
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

function normalizeLetter(letter: any): NormalizedLetter {
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

function stringifyId(entity: any): string {
  if (!entity) return Math.random().toString(36).slice(2);
  if (typeof entity === 'string') return entity;
  if (typeof entity._id === 'string') return entity._id;
  if (entity._id && typeof entity._id === 'object' && typeof entity._id.$oid === 'string') return entity._id.$oid;
  if (typeof entity.id === 'string') return entity.id;
  return Math.random().toString(36).slice(2);
}

function translate(locale: Locale, text: Readonly<{ en: string; ar: string }>): string {
  if (locale === 'ar') {
    return text.ar ?? text.en;
  }
  return text.en;
}
