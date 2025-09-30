'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RejectionRecord,
  UserRole,
  Locale,
  calculateAvgRejectionRate,
  calculateRecoveryRateFromRecords
} from '@brainsait/rejection-tracker';
import { ComplianceLetter } from '@brainsait/notification-service';

/**
 * NEURAL: BrainSAIT branded dashboard with mesh gradient
 * BILINGUAL: RTL/LTR adaptive layout
 */

interface DashboardProps {
  userRole: UserRole;
  locale: Locale;
}

export function RejectionDashboard({ userRole, locale }: DashboardProps) {
  const [rejections, setRejections] = useState<RejectionRecord[]>([]);
  const [complianceLetters, setComplianceLetters] = useState<ComplianceLetter[]>([]);
  const [loading, setLoading] = useState(true);

  const isRTL = locale === 'ar';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API calls
      // const [rejectionsData, lettersData] = await Promise.all([
      //   fetch('/api/rejections/current-month').then(r => r.json()),
      //   fetch('/api/compliance/letters/pending').then(r => r.json())
      // ]);

      // Mock data for now
      setRejections([]);
      setComplianceLetters([]);
    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">
          {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-black"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* NEURAL: Gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-brainsait-midnight via-black to-brainsait-violet opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-tr from-brainsait-blue/20 via-transparent to-brainsait-cyan/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="glass-morphism rounded-2xl p-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              {locale === 'ar' ? 'لوحة تحكم المطالبات والمرفوضات' : 'Claims & Rejections Dashboard'}
            </h1>
            <p className="text-gray-300">
              {locale === 'ar'
                ? 'نظام إدارة المطالبات التأمينية - BrainSAIT'
                : 'Insurance Claims Management System - BrainSAIT'
              }
            </p>
          </div>
        </motion.header>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title={locale === 'ar' ? 'المطالبات الشهرية' : 'Monthly Claims'}
            value={rejections.length}
            icon="📊"
            trend="+12%"
            trendUp={true}
            locale={locale}
          />

          <MetricCard
            title={locale === 'ar' ? 'نسبة المرفوضات' : 'Rejection Rate'}
            value={`${calculateAvgRejectionRate(rejections).toFixed(1)}%`}
            icon="⚠️"
            trend="-5%"
            trendUp={false}
            locale={locale}
          />

          <MetricCard
            title={locale === 'ar' ? 'نسبة الاسترداد' : 'Recovery Rate'}
            value={`${calculateRecoveryRateFromRecords(rejections).toFixed(1)}%`}
            icon="✅"
            trend="+8%"
            trendUp={true}
            locale={locale}
          />

          <MetricCard
            title={locale === 'ar' ? 'الخطابات المعلقة' : 'Pending Letters'}
            value={complianceLetters.length}
            icon="📧"
            trend="3 urgent"
            locale={locale}
          />
        </div>

        {/* Main Content */}
        <div className="glass-morphism rounded-2xl p-6">
          <div className="text-center text-gray-400 py-12">
            <p className="text-xl mb-4">
              {locale === 'ar'
                ? 'مرحباً بك في نظام BrainSAIT'
                : 'Welcome to BrainSAIT System'
              }
            </p>
            <p className="text-sm">
              {locale === 'ar'
                ? 'النظام جاهز للاستخدام. ابدأ بإضافة بيانات المرفوضات.'
                : 'System is ready. Start by adding rejection data.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      {userRole === 'ADMIN' && (
        <motion.button
          className="fixed bottom-8 right-8 bg-gradient-to-r from-brainsait-cyan to-brainsait-blue
                     text-white rounded-full p-4 shadow-2xl"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-2xl">📈</span>
        </motion.button>
      )}
    </div>
  );
}

/**
 * NEURAL: Glass morphism metric card
 */
function MetricCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  locale
}: {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendUp?: boolean;
  locale: Locale;
}) {
  return (
    <motion.div
      className="glass-morphism rounded-xl p-6 hover:scale-105 transition-transform"
      whileHover={{ y: -5 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl">{icon}</div>
        {trend && (
          <span className={`text-sm font-semibold ${
            trendUp ? 'text-green-400' : 'text-red-400'
          }`}>
            {trend}
          </span>
        )}
      </div>

      <h3 className="text-gray-300 text-sm mb-2">{title}</h3>
      <p className="text-white text-3xl font-bold">{value}</p>
    </motion.div>
  );
}