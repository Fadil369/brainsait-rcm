/**
 * BrainSAIT Teams Notification Modal
 * Component for sending Teams channel notifications
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';

import { apiClient } from '@/lib/api';

interface TeamsNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: 'en' | 'ar';
}

type NotificationType = 'compliance' | 'summary' | 'broadcast';

const COPY = {
  en: {
    title: 'Send Teams Notification',
    notificationType: 'Notification Type',
    complianceLetter: 'Compliance Letter',
    monthlySummary: 'Monthly Summary',
    broadcast: 'Broadcast Message',
    // Compliance Letter fields
    titleEn: 'Title (English)',
    titleAr: 'Title (Arabic)',
    insuranceCompany: 'Insurance Company',
    claimId: 'Claim ID',
    amount: 'Amount (SAR)',
    rejectionDate: 'Rejection Date',
    deadlineDays: 'Deadline Days',
    messageEn: 'Message (English)',
    messageAr: 'Message (Arabic)',
    isWarning: 'Warning Notification',
    // Monthly Summary fields
    month: 'Month',
    year: 'Year',
    totalClaims: 'Total Claims',
    rejectionRate: 'Rejection Rate (%)',
    totalAmount: 'Total Amount (SAR)',
    recoveryRate: 'Recovery Rate (%)',
    pendingLetters: 'Pending Letters',
    // Broadcast fields
    broadcastMessage: 'Broadcast Message',
    // Buttons
    send: 'Send Notification',
    cancel: 'Cancel',
    sending: 'Sending...',
    success: 'Notification sent successfully!',
    error: 'Failed to send notification',
  },
  ar: {
    title: 'إرسال إشعار Teams',
    notificationType: 'نوع الإشعار',
    complianceLetter: 'خطاب الامتثال',
    monthlySummary: 'الملخص الشهري',
    broadcast: 'رسالة بث',
    // Compliance Letter fields
    titleEn: 'العنوان (إنجليزي)',
    titleAr: 'العنوان (عربي)',
    insuranceCompany: 'شركة التأمين',
    claimId: 'معرف المطالبة',
    amount: 'المبلغ (ريال)',
    rejectionDate: 'تاريخ الرفض',
    deadlineDays: 'أيام الموعد النهائي',
    messageEn: 'الرسالة (إنجليزي)',
    messageAr: 'الرسالة (عربي)',
    isWarning: 'إشعار تحذير',
    // Monthly Summary fields
    month: 'الشهر',
    year: 'السنة',
    totalClaims: 'إجمالي المطالبات',
    rejectionRate: 'معدل الرفض (%)',
    totalAmount: 'المبلغ الإجمالي (ريال)',
    recoveryRate: 'معدل الاسترداد (%)',
    pendingLetters: 'الرسائل المعلقة',
    // Broadcast fields
    broadcastMessage: 'رسالة البث',
    // Buttons
    send: 'إرسال الإشعار',
    cancel: 'إلغاء',
    sending: 'جارٍ الإرسال...',
    success: 'تم إرسال الإشعار بنجاح!',
    error: 'فشل إرسال الإشعار',
  },
};

export function TeamsNotificationModal({
  isOpen,
  onClose,
  locale,
}: TeamsNotificationModalProps) {
  const [notificationType, setNotificationType] = useState<NotificationType>('compliance');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Compliance Letter state
  const [complianceData, setComplianceData] = useState({
    title_en: '',
    title_ar: '',
    insurance_company: '',
    claim_id: '',
    amount_sar: 0,
    rejection_date: new Date().toISOString().split('T')[0],
    deadline_days: 30,
    message_en: '',
    message_ar: '',
    is_warning: false,
  });

  // Monthly Summary state
  const [summaryData, setSummaryData] = useState({
    month: new Date().toLocaleDateString('en-US', { month: 'long' }),
    year: new Date().getFullYear(),
    total_claims: 0,
    rejection_rate: 0,
    total_amount_sar: 0,
    recovery_rate: 0,
    pending_letters: 0,
  });

  // Broadcast state
  const [broadcastText, setBroadcastText] = useState('');

  const copy = COPY[locale];

  const handleSend = async () => {
    setLoading(true);
    setMessage(null);

    try {
      if (notificationType === 'compliance') {
        await apiClient.sendTeamsComplianceLetter(complianceData);
      } else if (notificationType === 'summary') {
        // Add default top_reasons for demo
        const summaryWithReasons = {
          ...summaryData,
          top_reasons: [
            { reasonEn: 'Incomplete Documentation', reasonAr: 'وثائق غير مكتملة', count: 45 },
            { reasonEn: 'Pre-authorization Missing', reasonAr: 'التصريح المسبق مفقود', count: 38 },
            { reasonEn: 'Coding Error', reasonAr: 'خطأ في الترميز', count: 30 },
          ],
        };
        await apiClient.sendTeamsRejectionSummary(summaryWithReasons);
      } else if (notificationType === 'broadcast') {
        await apiClient.broadcastTeamsMessage(broadcastText);
      }

      setMessage({ type: 'success', text: copy.success });
      
      // Reset form after success
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to send Teams notification:', error);
      setMessage({ type: 'error', text: copy.error });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="glass-morphism w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">📢 {copy.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Notification Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {copy.notificationType}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setNotificationType('compliance')}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  notificationType === 'compliance'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📋 {copy.complianceLetter}
              </button>
              <button
                onClick={() => setNotificationType('summary')}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  notificationType === 'summary'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📊 {copy.monthlySummary}
              </button>
              <button
                onClick={() => setNotificationType('broadcast')}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  notificationType === 'broadcast'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📣 {copy.broadcast}
              </button>
            </div>
          </div>

          {/* Compliance Letter Form */}
          {notificationType === 'compliance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={copy.titleEn}
                  value={complianceData.title_en}
                  onChange={(e) =>
                    setComplianceData({ ...complianceData, title_en: e.target.value })
                  }
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder={copy.titleAr}
                  value={complianceData.title_ar}
                  onChange={(e) =>
                    setComplianceData({ ...complianceData, title_ar: e.target.value })
                  }
                  className="input-field"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={copy.insuranceCompany}
                  value={complianceData.insurance_company}
                  onChange={(e) =>
                    setComplianceData({ ...complianceData, insurance_company: e.target.value })
                  }
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder={copy.claimId}
                  value={complianceData.claim_id}
                  onChange={(e) =>
                    setComplianceData({ ...complianceData, claim_id: e.target.value })
                  }
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  placeholder={copy.amount}
                  value={complianceData.amount_sar || ''}
                  onChange={(e) =>
                    setComplianceData({ ...complianceData, amount_sar: Number(e.target.value) })
                  }
                  className="input-field"
                />
                <input
                  type="date"
                  value={complianceData.rejection_date}
                  onChange={(e) =>
                    setComplianceData({ ...complianceData, rejection_date: e.target.value })
                  }
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder={copy.deadlineDays}
                  value={complianceData.deadline_days}
                  onChange={(e) =>
                    setComplianceData({ ...complianceData, deadline_days: Number(e.target.value) })
                  }
                  className="input-field"
                />
              </div>

              <textarea
                placeholder={copy.messageEn}
                value={complianceData.message_en}
                onChange={(e) =>
                  setComplianceData({ ...complianceData, message_en: e.target.value })
                }
                className="input-field min-h-[80px]"
                rows={3}
              />

              <textarea
                placeholder={copy.messageAr}
                value={complianceData.message_ar}
                onChange={(e) =>
                  setComplianceData({ ...complianceData, message_ar: e.target.value })
                }
                className="input-field min-h-[80px]"
                dir="rtl"
                rows={3}
              />

              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={complianceData.is_warning}
                  onChange={(e) =>
                    setComplianceData({ ...complianceData, is_warning: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span>{copy.isWarning}</span>
              </label>
            </div>
          )}

          {/* Monthly Summary Form */}
          {notificationType === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={copy.month}
                  value={summaryData.month}
                  onChange={(e) => setSummaryData({ ...summaryData, month: e.target.value })}
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder={copy.year}
                  value={summaryData.year}
                  onChange={(e) =>
                    setSummaryData({ ...summaryData, year: Number(e.target.value) })
                  }
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder={copy.totalClaims}
                  value={summaryData.total_claims || ''}
                  onChange={(e) =>
                    setSummaryData({ ...summaryData, total_claims: Number(e.target.value) })
                  }
                  className="input-field"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder={copy.rejectionRate}
                  value={summaryData.rejection_rate || ''}
                  onChange={(e) =>
                    setSummaryData({ ...summaryData, rejection_rate: Number(e.target.value) })
                  }
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  placeholder={copy.totalAmount}
                  value={summaryData.total_amount_sar || ''}
                  onChange={(e) =>
                    setSummaryData({ ...summaryData, total_amount_sar: Number(e.target.value) })
                  }
                  className="input-field"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder={copy.recoveryRate}
                  value={summaryData.recovery_rate || ''}
                  onChange={(e) =>
                    setSummaryData({ ...summaryData, recovery_rate: Number(e.target.value) })
                  }
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder={copy.pendingLetters}
                  value={summaryData.pending_letters || ''}
                  onChange={(e) =>
                    setSummaryData({ ...summaryData, pending_letters: Number(e.target.value) })
                  }
                  className="input-field"
                />
              </div>
            </div>
          )}

          {/* Broadcast Form */}
          {notificationType === 'broadcast' && (
            <div className="space-y-4">
              <textarea
                placeholder={copy.broadcastMessage}
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                className="input-field min-h-[120px]"
                rows={5}
              />
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-500 bg-opacity-20 text-green-400'
                  : 'bg-red-500 bg-opacity-20 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSend}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? copy.sending : copy.send}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copy.cancel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
