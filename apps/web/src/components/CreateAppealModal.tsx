'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { apiClient } from '@/lib/api';

interface CreateAppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locale: 'ar' | 'en';
}

export function CreateAppealModal({ isOpen, onClose, onSuccess, locale }: CreateAppealModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    rejectionId: '',
    appealReason: '',
    supportingDocuments: '',
    submissionMethod: 'NPHIES' as 'NPHIES' | 'PORTAL' | 'EMAIL',
    appealedAmountNet: '',
    appealedAmountVat: '',
    additionalNotes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const appealedNet = parseFloat(formData.appealedAmountNet);
      const appealedVat = parseFloat(formData.appealedAmountVat);

      await apiClient.createAppeal({
        rejection_id: formData.rejectionId,
        appeal_reason: formData.appealReason,
        supporting_documents: formData.supportingDocuments.split(',').map(d => d.trim()).filter(Boolean),
        submission_method: formData.submissionMethod,
        appealed_amount: {
          net: appealedNet,
          vat: appealedVat,
          total: appealedNet + appealedVat
        },
        additional_notes: formData.additionalNotes
      });

      onSuccess();
      onClose();

      // Reset form
      setFormData({
        rejectionId: '',
        appealReason: '',
        supportingDocuments: '',
        submissionMethod: 'NPHIES',
        appealedAmountNet: '',
        appealedAmountVat: '',
        additionalNotes: ''
      });
    } catch (err: any) {
      setError(locale === 'ar' ? 'فشل إنشاء الاستئناف' : 'Failed to create appeal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === 'ar' ? '📝 إنشاء استئناف' : '📝 Create Appeal'}
      locale={locale}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
              placeholder={locale === 'ar' ? 'أدخل رقم المرفوض' : 'Enter rejection ID'}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'طريقة التقديم' : 'Submission Method'} *
            </label>
            <select
              required
              value={formData.submissionMethod}
              onChange={(e) => setFormData({ ...formData, submissionMethod: e.target.value as any })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
            >
              <option value="NPHIES">NPHIES</option>
              <option value="PORTAL">Portal</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'المبلغ المستأنف (صافي)' : 'Appealed Amount (Net)'} SAR *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.appealedAmountNet}
                onChange={(e) => setFormData({ ...formData, appealedAmountNet: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'المبلغ المستأنف (ضريبة)' : 'Appealed Amount (VAT)'} SAR *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.appealedAmountVat}
                onChange={(e) => setFormData({ ...formData, appealedAmountVat: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'سبب الاستئناف' : 'Appeal Reason'} *
            </label>
            <textarea
              required
              rows={4}
              value={formData.appealReason}
              onChange={(e) => setFormData({ ...formData, appealReason: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              placeholder={locale === 'ar' ? 'اشرح سبب الاستئناف بالتفصيل' : 'Explain the reason for appeal in detail'}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'المستندات الداعمة' : 'Supporting Documents'}
            </label>
            <input
              type="text"
              value={formData.supportingDocuments}
              onChange={(e) => setFormData({ ...formData, supportingDocuments: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              placeholder={locale === 'ar' ? 'افصل بين المستندات بفاصلة' : 'Separate documents with commas'}
            />
            <p className="text-xs text-gray-500 mt-1">
              {locale === 'ar' ? 'مثال: تقرير_طبي.pdf, فاتورة.pdf' : 'Example: medical_report.pdf, invoice.pdf'}
            </p>
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
              ? (locale === 'ar' ? 'جاري التقديم...' : 'Submitting...')
              : (locale === 'ar' ? 'تقديم الاستئناف' : 'Submit Appeal')
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}
