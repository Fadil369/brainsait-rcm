'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { apiClient } from '@/lib/api';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: 'ar' | 'en';
}

export function WhatsAppModal({ isOpen, onClose, locale }: WhatsAppModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    phoneNumber: '',
    message: '',
    template: 'custom' as 'custom' | 'compliance' | 'reminder' | 'appeal_update'
  });

  const templates = {
    compliance: {
      ar: 'تذكير: المطالبة #{CLAIM_ID} تقترب من موعد 30 يومًا. يرجى المراجعة.',
      en: 'Reminder: Claim #{CLAIM_ID} is approaching the 30-day deadline. Please review.'
    },
    reminder: {
      ar: 'تذكير: لديك {COUNT} مطالبات معلقة تتطلب اهتمامك.',
      en: 'Reminder: You have {COUNT} pending claims requiring your attention.'
    },
    appeal_update: {
      ar: 'تحديث: تم تقديم الاستئناف #{APPEAL_ID} بنجاح إلى {COMPANY}.',
      en: 'Update: Appeal #{APPEAL_ID} has been successfully submitted to {COMPANY}.'
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const message = formData.template !== 'custom'
        ? templates[formData.template][locale]
        : formData.message;

      await apiClient.sendWhatsAppNotification(
        formData.phoneNumber,
        message,
        formData.template !== 'custom' ? formData.template : undefined
      );

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          phoneNumber: '',
          message: '',
          template: 'custom'
        });
      }, 2000);
    } catch (err: any) {
      setError(locale === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === 'ar' ? '💬 إرسال إشعار واتساب' : '💬 Send WhatsApp Notification'}
      locale={locale}
      size="md"
    >
      <form onSubmit={handleSend} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-300 text-sm">
            ✅ {locale === 'ar' ? 'تم إرسال الرسالة بنجاح!' : 'Message sent successfully!'}
          </div>
        )}

        <div>
          <label className="block text-gray-300 mb-2 text-sm">
            {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'} *
          </label>
          <input
            type="tel"
            required
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
            placeholder="+966501234567"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2 text-sm">
            {locale === 'ar' ? 'القالب' : 'Template'}
          </label>
          <select
            value={formData.template}
            onChange={(e) => setFormData({ ...formData, template: e.target.value as any })}
            className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
          >
            <option value="custom">{locale === 'ar' ? 'رسالة مخصصة' : 'Custom Message'}</option>
            <option value="compliance">{locale === 'ar' ? 'تذكير الامتثال' : 'Compliance Reminder'}</option>
            <option value="reminder">{locale === 'ar' ? 'تذكير عام' : 'General Reminder'}</option>
            <option value="appeal_update">{locale === 'ar' ? 'تحديث الاستئناف' : 'Appeal Update'}</option>
          </select>
        </div>

        {formData.template !== 'custom' && (
          <div className="p-4 bg-brainsait-blue/10 border border-brainsait-blue/30 rounded-lg">
            <p className="text-sm text-gray-300">
              <strong>{locale === 'ar' ? 'معاينة القالب:' : 'Template Preview:'}</strong>
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {templates[formData.template][locale]}
            </p>
          </div>
        )}

        {formData.template === 'custom' && (
          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'الرسالة' : 'Message'} *
            </label>
            <textarea
              required
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              placeholder={locale === 'ar' ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
            />
          </div>
        )}

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
            disabled={loading || success}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {loading
              ? (locale === 'ar' ? '📤 جاري الإرسال...' : '📤 Sending...')
              : (locale === 'ar' ? '📤 إرسال' : '📤 Send')
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}
