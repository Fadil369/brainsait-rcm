'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { apiClient } from '@/lib/api';
import { motion } from 'framer-motion';

interface CreateRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locale: 'ar' | 'en';
}

export function CreateRejectionModal({ isOpen, onClose, onSuccess, locale }: CreateRejectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    claimId: '',
    tpaName: '',
    insuranceCompany: '',
    branch: '',
    receptionMode: 'NPHIES' as 'NPHIES' | 'PORTAL' | 'EMAIL',
    billedAmountNet: '',
    billedAmountVat: '',
    rejectedAmountNet: '',
    rejectedAmountVat: '',
    rejectionReceivedDate: new Date().toISOString().split('T')[0],
    rejectionReason: '',
    nphiesReference: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const billedNet = parseFloat(formData.billedAmountNet);
      const billedVat = parseFloat(formData.billedAmountVat);
      const rejectedNet = parseFloat(formData.rejectedAmountNet);
      const rejectedVat = parseFloat(formData.rejectedAmountVat);

      await apiClient.createRejection({
        claim_id: formData.claimId,
        tpa_name: formData.tpaName,
        insurance_company: formData.insuranceCompany,
        branch: formData.branch,
        reception_mode: formData.receptionMode,
        billed_amount: {
          net: billedNet,
          vat: billedVat,
          total: billedNet + billedVat
        },
        rejected_amount: {
          net: rejectedNet,
          vat: rejectedVat,
          total: rejectedNet + rejectedVat
        },
        rejection_received_date: formData.rejectionReceivedDate,
        rejection_reason: formData.rejectionReason,
        nphies_reference: formData.nphiesReference || undefined
      });

      onSuccess();
      onClose();

      // Reset form
      setFormData({
        claimId: '',
        tpaName: '',
        insuranceCompany: '',
        branch: '',
        receptionMode: 'NPHIES',
        billedAmountNet: '',
        billedAmountVat: '',
        rejectedAmountNet: '',
        rejectedAmountVat: '',
        rejectionReceivedDate: new Date().toISOString().split('T')[0],
        rejectionReason: '',
        nphiesReference: ''
      });
    } catch (err: any) {
      setError(locale === 'ar' ? 'فشل إنشاء المرفوض' : 'Failed to create rejection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === 'ar' ? '➕ إضافة مطالبة مرفوضة' : '➕ Add Rejection Record'}
      locale={locale}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Claim Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            {locale === 'ar' ? 'معلومات المطالبة' : 'Claim Information'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'طريقة الاستلام' : 'Reception Mode'} *
              </label>
              <select
                required
                value={formData.receptionMode}
                onChange={(e) => setFormData({ ...formData, receptionMode: e.target.value as any })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              >
                <option value="NPHIES">NPHIES</option>
                <option value="PORTAL">Portal</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'شركة إدارة المطالبات' : 'TPA Name'} *
              </label>
              <input
                type="text"
                required
                value={formData.tpaName}
                onChange={(e) => setFormData({ ...formData, tpaName: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'شركة التأمين' : 'Insurance Company'} *
              </label>
              <input
                type="text"
                required
                value={formData.insuranceCompany}
                onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'الفرع' : 'Branch'} *
              </label>
              <input
                type="text"
                required
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'تاريخ الاستلام' : 'Rejection Date'} *
              </label>
              <input
                type="date"
                required
                value={formData.rejectionReceivedDate}
                onChange={(e) => setFormData({ ...formData, rejectionReceivedDate: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            {locale === 'ar' ? 'المعلومات المالية' : 'Financial Information'}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'المبلغ المطالب (صافي)' : 'Billed Amount (Net)'} SAR *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.billedAmountNet}
                onChange={(e) => setFormData({ ...formData, billedAmountNet: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'المبلغ المطالب (ضريبة)' : 'Billed Amount (VAT)'} SAR *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.billedAmountVat}
                onChange={(e) => setFormData({ ...formData, billedAmountVat: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'المبلغ المرفوض (صافي)' : 'Rejected Amount (Net)'} SAR *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.rejectedAmountNet}
                onChange={(e) => setFormData({ ...formData, rejectedAmountNet: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'المبلغ المرفوض (ضريبة)' : 'Rejected Amount (VAT)'} SAR *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.rejectedAmountVat}
                onChange={(e) => setFormData({ ...formData, rejectedAmountVat: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'سبب الرفض' : 'Rejection Reason'} *
            </label>
            <textarea
              required
              rows={3}
              value={formData.rejectionReason}
              onChange={(e) => setFormData({ ...formData, rejectionReason: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              {locale === 'ar' ? 'رقم مرجع NPHIES' : 'NPHIES Reference'} ({locale === 'ar' ? 'اختياري' : 'Optional'})
            </label>
            <input
              type="text"
              value={formData.nphiesReference}
              onChange={(e) => setFormData({ ...formData, nphiesReference: e.target.value })}
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
              ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (locale === 'ar' ? 'حفظ' : 'Save')
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}
