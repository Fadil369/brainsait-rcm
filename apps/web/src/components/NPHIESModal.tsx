'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { apiClient } from '@/lib/api';

interface NPHIESModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locale: 'ar' | 'en';
}

export function NPHIESModal({ isOpen, onClose, onSuccess, locale }: NPHIESModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [nphiesReference, setNphiesReference] = useState('');

  const [formData, setFormData] = useState({
    claimId: '',
    submissionType: 'claim' as 'claim' | 'appeal',
    patientId: '',
    providerId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    totalAmount: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const payload = {
        claim_id: formData.claimId,
        patient_id: formData.patientId,
        provider_id: formData.providerId,
        service_date: formData.serviceDate,
        total_amount: parseFloat(formData.totalAmount)
      };

      let result;
      if (formData.submissionType === 'claim') {
        result = await apiClient.submitClaimToNPHIES(payload);
      } else {
        result = await apiClient.submitAppealToNPHIES(payload);
      }

      setSuccess(true);
      setNphiesReference(result.nphies_reference || 'N/A');

      setTimeout(() => {
        onSuccess();
        onClose();
        setFormData({
          claimId: '',
          submissionType: 'claim',
          patientId: '',
          providerId: '',
          serviceDate: new Date().toISOString().split('T')[0],
          totalAmount: ''
        });
        setSuccess(false);
        setNphiesReference('');
      }, 3000);
    } catch (err: any) {
      setError(locale === 'ar' ? 'فشل التقديم إلى NPHIES' : 'Failed to submit to NPHIES');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === 'ar' ? '🏥 تقديم إلى NPHIES' : '🏥 Submit to NPHIES'}
      locale={locale}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-300">
            <p className="font-semibold mb-2">
              ✅ {locale === 'ar' ? 'تم التقديم بنجاح!' : 'Successfully submitted!'}
            </p>
            <p className="text-sm">
              {locale === 'ar' ? 'رقم المرجع' : 'Reference'}: <strong>{nphiesReference}</strong>
            </p>
          </div>
        )}

        {!success && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'نوع التقديم' : 'Submission Type'} *
              </label>
              <select
                required
                value={formData.submissionType}
                onChange={(e) => setFormData({ ...formData, submissionType: e.target.value as any })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              >
                <option value="claim">{locale === 'ar' ? 'مطالبة جديدة' : 'New Claim'}</option>
                <option value="appeal">{locale === 'ar' ? 'استئناف' : 'Appeal'}</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'رقم المطالبة' : 'Claim ID'} *
              </label>
              <input
                type="text"
                required
                value={formData.claimId}
                onChange={(e) => setFormData({ ...formData, claimId: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2 text-sm">
                  {locale === 'ar' ? 'رقم المريض' : 'Patient ID'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm">
                  {locale === 'ar' ? 'رقم المقدم' : 'Provider ID'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.providerId}
                  onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                  className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2 text-sm">
                  {locale === 'ar' ? 'تاريخ الخدمة' : 'Service Date'} *
                </label>
                <input
                  type="date"
                  required
                  value={formData.serviceDate}
                  onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                  className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm">
                  {locale === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'} SAR *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-brainsait-blue/10 border border-brainsait-blue/30 rounded-lg">
              <p className="text-sm text-gray-300">
                {locale === 'ar'
                  ? '🔒 يتم التقديم بشكل آمن إلى المنصة الوطنية الموحدة للتأمين الصحي (NPHIES).'
                  : '🔒 Securely submitting to the National Platform for Health Insurance Exchange Services (NPHIES).'
                }
              </p>
            </div>
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
            {success ? (locale === 'ar' ? 'إغلاق' : 'Close') : (locale === 'ar' ? 'إلغاء' : 'Cancel')}
          </button>
          {!success && (
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-brainsait-cyan to-brainsait-blue text-white rounded-lg hover:shadow-xl transition disabled:opacity-50"
            >
              {loading
                ? (locale === 'ar' ? '📤 جاري التقديم...' : '📤 Submitting...')
                : (locale === 'ar' ? '📤 تقديم' : '📤 Submit')
              }
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
