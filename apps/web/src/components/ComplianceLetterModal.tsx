'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { apiClient } from '@/lib/api';

interface ComplianceLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locale: 'ar' | 'en';
}

export function ComplianceLetterModal({ isOpen, onClose, onSuccess, locale }: ComplianceLetterModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    rejectionId: '',
    letterType: 'INITIAL_NOTIFICATION' as 'INITIAL_NOTIFICATION' | 'WARNING_FINAL' | 'INFORMATION_REQUEST',
    recipientName: '',
    recipientEmail: '',
    additionalNotes: ''
  });

  const letterTypes = {
    INITIAL_NOTIFICATION: {
      ar: 'إشعار أولي (30 يوم)',
      en: 'Initial Notification (30-day)'
    },
    WARNING_FINAL: {
      ar: 'تحذير نهائي',
      en: 'Final Warning'
    },
    INFORMATION_REQUEST: {
      ar: 'طلب معلومات',
      en: 'Information Request'
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClient.createComplianceLetter({
        rejection_id: formData.rejectionId,
        letter_type: formData.letterType,
        recipient_name: formData.recipientName,
        recipient_email: formData.recipientEmail,
        additional_notes: formData.additionalNotes
      });

      onSuccess();
      onClose();

      // Reset form
      setFormData({
        rejectionId: '',
        letterType: 'INITIAL_NOTIFICATION',
        recipientName: '',
        recipientEmail: '',
        additionalNotes: ''
      });
    } catch (err: any) {
      setError(locale === 'ar' ? 'فشل إنشاء الخطاب' : 'Failed to generate letter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === 'ar' ? '📄 إنشاء خطاب امتثال' : '📄 Generate Compliance Letter'}
      locale={locale}
      size="md"
    >
      <form onSubmit={handleGenerate} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'رقم المرفوض' : 'Rejection ID'} *
            </label>
            <input
              type="text"
              required
              value={formData.rejectionId}
              onChange={(e) => setFormData({ ...formData, rejectionId: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'نوع الخطاب' : 'Letter Type'} *
            </label>
            <select
              required
              value={formData.letterType}
              onChange={(e) => setFormData({ ...formData, letterType: e.target.value as any })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
            >
              {Object.entries(letterTypes).map(([key, value]) => (
                <option key={key} value={key}>
                  {locale === 'ar' ? value.ar : value.en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'اسم المستلم' : 'Recipient Name'} *
            </label>
            <input
              type="text"
              required
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} *
            </label>
            <input
              type="email"
              required
              value={formData.recipientEmail}
              onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
            </label>
            <textarea
              rows={3}
              value={formData.additionalNotes}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-brainsait-blue/10 border border-brainsait-blue/30 rounded-lg">
          <p className="text-sm text-gray-300">
            {locale === 'ar'
              ? '📧 سيتم إرسال الخطاب تلقائيًا إلى البريد الإلكتروني المحدد مع نسخة PDF.'
              : '📧 The letter will be automatically sent to the specified email with a PDF attachment.'
            }
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
          >
            {locale === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-brainsait-cyan to-brainsait-blue text-white rounded-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {loading
              ? (locale === 'ar' ? '📤 جاري الإنشاء...' : '📤 Generating...')
              : (locale === 'ar' ? '📤 إنشاء وإرسال' : '📤 Generate & Send')
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}
