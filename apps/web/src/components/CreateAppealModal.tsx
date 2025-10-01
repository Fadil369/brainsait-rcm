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

export function CreateAppealModal({ isOpen, onClose, onSuccess, locale }: Readonly<CreateAppealModalProps>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    rejectionId: '',
    appealReason: '',
    supportingDocuments: '',
    submissionMethod: 'NPHIES' as 'NPHIES' | 'PORTAL' | 'EMAIL',
    appealedAmountNet: '',
    appealedAmountVat: '',
    additionalNotes: ''
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.rejectionId.trim()) {
      errors.rejectionId = locale === 'ar' ? 'رقم المرفوض مطلوب' : 'Rejection ID is required';
    }

    const appealedNet = parseFloat(formData.appealedAmountNet);
    const appealedVat = parseFloat(formData.appealedAmountVat);

    if (isNaN(appealedNet) || appealedNet <= 0) {
      errors.appealedAmountNet = locale === 'ar' ? 'المبلغ الصافي يجب أن يكون أكبر من صفر' : 'Net amount must be greater than zero';
    }

    if (isNaN(appealedVat) || appealedVat < 0) {
      errors.appealedAmountVat = locale === 'ar' ? 'ضريبة القيمة المضافة لا يمكن أن تكون سالبة' : 'VAT cannot be negative';
    }

    if (!formData.appealReason.trim()) {
      errors.appealReason = locale === 'ar' ? 'سبب الاستئناف مطلوب' : 'Appeal reason is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Failed to create appeal:', errorMessage);
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
            <label htmlFor="rejectionId" className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'رقم المرفوض' : 'Rejection ID'} *
            </label>
            <input
              id="rejectionId"
              type="text"
              required
              value={formData.rejectionId}
              onChange={(e) => {
                setFormData({ ...formData, rejectionId: e.target.value });
                if (fieldErrors.rejectionId) {
                  setFieldErrors({ ...fieldErrors, rejectionId: '' });
                }
              }}
              className={`w-full px-4 py-2 bg-black/40 border rounded-lg text-white focus:outline-none transition ${
                fieldErrors.rejectionId
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-gray-700 focus:border-brainsait-cyan'
              }`}
              placeholder={locale === 'ar' ? 'أدخل رقم المرفوض' : 'Enter rejection ID'}
              aria-invalid={fieldErrors.rejectionId ? 'true' : 'false'}
              aria-describedby={fieldErrors.rejectionId ? 'rejectionId-error' : undefined}
            />
            {fieldErrors.rejectionId && (
              <p id="rejectionId-error" className="text-red-400 text-xs mt-1" role="alert">
                {fieldErrors.rejectionId}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="submissionMethod" className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'طريقة التقديم' : 'Submission Method'} *
            </label>
            <select
              id="submissionMethod"
              required
              value={formData.submissionMethod}
              onChange={(e) => setFormData({ ...formData, submissionMethod: e.target.value as any })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none transition"
              aria-label={locale === 'ar' ? 'طريقة تقديم الاستئناف' : 'Appeal submission method'}
            >
              <option value="NPHIES">NPHIES</option>
              <option value="PORTAL">Portal</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="appealedAmountNet" className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'المبلغ المستأنف (صافي)' : 'Appealed Amount (Net)'} SAR *
              </label>
              <input
                id="appealedAmountNet"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.appealedAmountNet}
                onChange={(e) => {
                  setFormData({ ...formData, appealedAmountNet: e.target.value });
                  if (fieldErrors.appealedAmountNet) {
                    setFieldErrors({ ...fieldErrors, appealedAmountNet: '' });
                  }
                }}
                className={`w-full px-4 py-2 bg-black/40 border rounded-lg text-white focus:outline-none transition ${
                  fieldErrors.appealedAmountNet
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-gray-700 focus:border-brainsait-cyan'
                }`}
                aria-invalid={fieldErrors.appealedAmountNet ? 'true' : 'false'}
                aria-describedby={fieldErrors.appealedAmountNet ? 'appealedAmountNet-error' : undefined}
              />
              {fieldErrors.appealedAmountNet && (
                <p id="appealedAmountNet-error" className="text-red-400 text-xs mt-1" role="alert">
                  {fieldErrors.appealedAmountNet}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="appealedAmountVat" className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'المبلغ المستأنف (ضريبة)' : 'Appealed Amount (VAT)'} SAR *
              </label>
              <input
                id="appealedAmountVat"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.appealedAmountVat}
                onChange={(e) => {
                  setFormData({ ...formData, appealedAmountVat: e.target.value });
                  if (fieldErrors.appealedAmountVat) {
                    setFieldErrors({ ...fieldErrors, appealedAmountVat: '' });
                  }
                }}
                className={`w-full px-4 py-2 bg-black/40 border rounded-lg text-white focus:outline-none transition ${
                  fieldErrors.appealedAmountVat
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-gray-700 focus:border-brainsait-cyan'
                }`}
                aria-invalid={fieldErrors.appealedAmountVat ? 'true' : 'false'}
                aria-describedby={fieldErrors.appealedAmountVat ? 'appealedAmountVat-error' : undefined}
              />
              {fieldErrors.appealedAmountVat && (
                <p id="appealedAmountVat-error" className="text-red-400 text-xs mt-1" role="alert">
                  {fieldErrors.appealedAmountVat}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="appealReason" className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'سبب الاستئناف' : 'Appeal Reason'} *
            </label>
            <textarea
              id="appealReason"
              required
              rows={4}
              minLength={20}
              maxLength={1000}
              value={formData.appealReason}
              onChange={(e) => {
                setFormData({ ...formData, appealReason: e.target.value });
                if (fieldErrors.appealReason) {
                  setFieldErrors({ ...fieldErrors, appealReason: '' });
                }
              }}
              className={`w-full px-4 py-2 bg-black/40 border rounded-lg text-white focus:outline-none transition resize-none ${
                fieldErrors.appealReason
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-gray-700 focus:border-brainsait-cyan'
              }`}
              placeholder={locale === 'ar' ? 'اشرح سبب الاستئناف بالتفصيل (20 حرفًا على الأقل)' : 'Explain the reason for appeal in detail (min 20 characters)'}
              aria-invalid={fieldErrors.appealReason ? 'true' : 'false'}
              aria-describedby={fieldErrors.appealReason ? 'appealReason-error' : 'appealReason-hint'}
            />
            <div className="flex justify-between items-center mt-1">
              <p id="appealReason-hint" className="text-xs text-gray-500">
                {locale === 'ar' ? `${formData.appealReason.length}/1000 حرف` : `${formData.appealReason.length}/1000 characters`}
              </p>
              {fieldErrors.appealReason && (
                <p id="appealReason-error" className="text-red-400 text-xs" role="alert">
                  {fieldErrors.appealReason}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="supportingDocuments" className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'المستندات الداعمة' : 'Supporting Documents'}
            </label>
            <input
              id="supportingDocuments"
              type="text"
              value={formData.supportingDocuments}
              onChange={(e) => setFormData({ ...formData, supportingDocuments: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none transition"
              placeholder={locale === 'ar' ? 'افصل بين المستندات بفاصلة' : 'Separate documents with commas'}
              aria-describedby="supportingDocuments-hint"
            />
            <p id="supportingDocuments-hint" className="text-xs text-gray-500 mt-1">
              {locale === 'ar' ? 'مثال: تقرير_طبي.pdf, فاتورة.pdf' : 'Example: medical_report.pdf, invoice.pdf'}
            </p>
          </div>

          <div>
            <label htmlFor="additionalNotes" className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
            </label>
            <textarea
              id="additionalNotes"
              rows={3}
              maxLength={500}
              value={formData.additionalNotes}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none transition resize-none"
              placeholder={locale === 'ar' ? 'ملاحظات اختيارية...' : 'Optional notes...'}
              aria-describedby="additionalNotes-hint"
            />
            <p id="additionalNotes-hint" className="text-xs text-gray-500 mt-1">
              {locale === 'ar' ? `${formData.additionalNotes.length}/500 حرف` : `${formData.additionalNotes.length}/500 characters`}
            </p>
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
            {(() => {
              if (loading) {
                return locale === 'ar' ? 'جاري التقديم...' : 'Submitting...';
              }
              return locale === 'ar' ? 'تقديم الاستئناف' : 'Submit Appeal';
            })()}
          </button>
        </div>
      </form>
    </Modal>
  );
}
