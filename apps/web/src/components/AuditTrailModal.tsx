'use client';

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { apiClient } from '@/lib/api';
import { motion } from 'framer-motion';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: 'ar' | 'en';
}

export function AuditTrailModal({ isOpen, onClose, locale }: AuditTrailModalProps) {
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'suspicious'>('logs');
  const [userId, setUserId] = useState('current');

  useEffect(() => {
    if (isOpen) {
      fetchAuditData();
    }
  }, [isOpen, activeTab]);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'logs') {
        const logs = await apiClient.getUserAuditTrail(userId, 50);
        setAuditLogs(logs || []);
      } else {
        const suspicious = await apiClient.getSuspiciousActivity();
        setSuspiciousActivity(suspicious || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeBadge = (type: string) => {
    const badges: Record<string, { color: string; label: { ar: string; en: string } }> = {
      ACCESS: { color: 'bg-blue-500', label: { ar: 'وصول', en: 'Access' } },
      CREATE: { color: 'bg-green-500', label: { ar: 'إنشاء', en: 'Create' } },
      UPDATE: { color: 'bg-yellow-500', label: { ar: 'تحديث', en: 'Update' } },
      DELETE: { color: 'bg-red-500', label: { ar: 'حذف', en: 'Delete' } },
      LOGIN: { color: 'bg-purple-500', label: { ar: 'تسجيل دخول', en: 'Login' } },
      LOGOUT: { color: 'bg-gray-500', label: { ar: 'تسجيل خروج', en: 'Logout' } }
    };

    const badge = badges[type] || { color: 'bg-gray-500', label: { ar: type, en: type } };
    return (
      <span className={`px-2 py-1 ${badge.color} text-white text-xs rounded-full`}>
        {locale === 'ar' ? badge.label.ar : badge.label.en}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === 'ar' ? '🔍 سجل المراجعة' : '🔍 Audit Trail'}
      locale={locale}
      size="xl"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'logs'
                ? 'text-brainsait-cyan border-b-2 border-brainsait-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {locale === 'ar' ? '📋 السجلات' : '📋 Logs'}
          </button>
          <button
            onClick={() => setActiveTab('suspicious')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'suspicious'
                ? 'text-brainsait-cyan border-b-2 border-brainsait-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {locale === 'ar' ? '⚠️ نشاط مشبوه' : '⚠️ Suspicious Activity'}
          </button>
        </div>

        {/* User Filter (for logs tab) */}
        {activeTab === 'logs' && (
          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'معرف المستخدم' : 'User ID'}
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onBlur={fetchAuditData}
              className="w-full max-w-md px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              placeholder={locale === 'ar' ? 'current أو معرف محدد' : 'current or specific user ID'}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 text-gray-400">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        )}

        {/* Audit Logs */}
        {!loading && activeTab === 'logs' && (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {locale === 'ar' ? 'لا توجد سجلات' : 'No logs found'}
              </div>
            ) : (
              auditLogs.map((log, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-morphism p-4 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      {getEventTypeBadge(log.event_type)}
                      <span className="ml-2 text-gray-400 text-sm">
                        {new Date(log.timestamp).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{log.user_id}</span>
                  </div>
                  <p className="text-sm text-gray-300">{log.description || log.event_type}</p>
                  {log.details && (
                    <p className="text-xs text-gray-500 mt-1">{JSON.stringify(log.details)}</p>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Suspicious Activity */}
        {!loading && activeTab === 'suspicious' && (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {suspiciousActivity.length === 0 ? (
              <div className="text-center py-12 text-green-400">
                ✅ {locale === 'ar' ? 'لا توجد أنشطة مشبوهة' : 'No suspicious activity detected'}
              </div>
            ) : (
              suspiciousActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-morphism p-4 rounded-lg border-l-4 border-red-500"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-red-400 font-semibold">⚠️ {activity.type}</span>
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(activity.timestamp).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">
                      {locale === 'ar' ? 'خطر عالي' : 'High Risk'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{activity.description}</p>
                  {activity.user_id && (
                    <p className="text-xs text-gray-500 mt-2">
                      {locale === 'ar' ? 'المستخدم' : 'User'}: {activity.user_id}
                    </p>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end pt-4 border-t border-gray-700">
          <button
            onClick={fetchAuditData}
            disabled={loading}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
          >
            {locale === 'ar' ? '🔄 تحديث' : '🔄 Refresh'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-brainsait-cyan to-brainsait-blue text-white rounded-lg hover:shadow-xl transition"
          >
            {locale === 'ar' ? '✅ إغلاق' : '✅ Close'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
