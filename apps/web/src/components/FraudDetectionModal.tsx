'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { useFraudDetection } from '@/lib/hooks';
import { motion } from 'framer-motion';

interface FraudDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: 'ar' | 'en';
}

export function FraudDetectionModal({ isOpen, onClose, locale }: FraudDetectionModalProps) {
  const { result, loading, error, analyze } = useFraudDetection();
  const [claimIds, setClaimIds] = useState('');

  const handleAnalyze = async () => {
    const ids = claimIds.split(',').map(id => id.trim()).filter(Boolean);

    // Mock claims data - in real app, fetch from API
    const claims = ids.map(id => ({
      claim_id: id,
      provider_id: `provider_${Math.random().toString(36).substr(2, 9)}`,
      patient_id: `patient_${Math.random().toString(36).substr(2, 9)}`,
      billed_amount: Math.random() * 10000 + 1000,
      service_date: new Date().toISOString(),
      procedure_codes: ['99213', '85025'],
      diagnosis_codes: ['Z00.00']
    }));

    await analyze(claims);
  };

  const getFraudTypeBadge = (type: string) => {
    const badges: Record<string, { color: string; label: { ar: string; en: string } }> = {
      duplicate_billing: { color: 'bg-red-500', label: { ar: 'فواتير مكررة', en: 'Duplicate Billing' } },
      unbundling: { color: 'bg-orange-500', label: { ar: 'تفريق الخدمات', en: 'Unbundling' } },
      upcoding: { color: 'bg-yellow-500', label: { ar: 'ترميز مضخم', en: 'Upcoding' } },
      phantom_billing: { color: 'bg-purple-500', label: { ar: 'فواتير وهمية', en: 'Phantom Billing' } },
      ml_anomaly: { color: 'bg-blue-500', label: { ar: 'شذوذ ML', en: 'ML Anomaly' } }
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
      title={locale === 'ar' ? '🔍 كشف الاحتيال بالذكاء الاصطناعي' : '🔍 AI Fraud Detection'}
      locale={locale}
      size="lg"
    >
      <div className="space-y-6">
        {/* Input Section */}
        {!result && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'أرقام المطالبات للتحليل' : 'Claim IDs to Analyze'}
              </label>
              <textarea
                rows={4}
                value={claimIds}
                onChange={(e) => setClaimIds(e.target.value)}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
                placeholder={locale === 'ar' ? 'أدخل أرقام المطالبات مفصولة بفاصلة' : 'Enter claim IDs separated by commas'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {locale === 'ar' ? 'مثال: CLM001, CLM002, CLM003' : 'Example: CLM001, CLM002, CLM003'}
              </p>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !claimIds.trim()}
              className="w-full py-3 bg-gradient-to-r from-brainsait-cyan to-brainsait-blue text-white rounded-lg hover:shadow-xl transition disabled:opacity-50"
            >
              {loading
                ? (locale === 'ar' ? '🔄 جاري التحليل...' : '🔄 Analyzing...')
                : (locale === 'ar' ? '🚀 بدء التحليل' : '🚀 Start Analysis')
              }
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
            {locale === 'ar' ? 'فشل تحليل الاحتيال' : 'Fraud analysis failed'}
          </div>
        )}

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-morphism p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">
                  {locale === 'ar' ? 'إجمالي' : 'Total'}
                </div>
                <div className="text-2xl font-bold text-white">
                  {result.total_analyzed || 0}
                </div>
              </div>

              <div className="glass-morphism p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">
                  {locale === 'ar' ? 'مشبوه' : 'Suspicious'}
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {result.suspicious_count || 0}
                </div>
              </div>

              <div className="glass-morphism p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">
                  {locale === 'ar' ? 'نظيف' : 'Clean'}
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {(result.total_analyzed || 0) - (result.suspicious_count || 0)}
                </div>
              </div>

              <div className="glass-morphism p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">
                  {locale === 'ar' ? 'معدل الاحتيال' : 'Fraud Rate'}
                </div>
                <div className="text-2xl font-bold text-orange-400">
                  {result.fraud_rate ? `${result.fraud_rate.toFixed(1)}%` : '0%'}
                </div>
              </div>
            </div>

            {/* Suspicious Claims */}
            {result.suspicious_claims && result.suspicious_claims.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {locale === 'ar' ? '⚠️ مطالبات مشبوهة' : '⚠️ Suspicious Claims'}
                </h3>
                <div className="space-y-3">
                  {result.suspicious_claims.map((claim: any, index: number) => (
                    <div key={index} className="glass-morphism p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-white font-semibold">{claim.claim_id}</span>
                          <p className="text-sm text-gray-400 mt-1">
                            {locale === 'ar' ? 'نقاط الخطر' : 'Risk Score'}:
                            <span className={`ml-2 font-bold ${
                              claim.risk_score > 0.7 ? 'text-red-400' :
                              claim.risk_score > 0.4 ? 'text-orange-400' :
                              'text-yellow-400'
                            }`}>
                              {(claim.risk_score * 100).toFixed(0)}%
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {claim.fraud_types?.map((type: string, i: number) => (
                            <div key={i}>{getFraudTypeBadge(type)}</div>
                          ))}
                        </div>
                      </div>
                      {claim.details && (
                        <p className="text-sm text-gray-300 mt-2">
                          {claim.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setClaimIds('');
                }}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                {locale === 'ar' ? '🔄 تحليل جديد' : '🔄 New Analysis'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-brainsait-cyan to-brainsait-blue text-white rounded-lg hover:shadow-xl transition"
              >
                {locale === 'ar' ? '✅ إغلاق' : '✅ Close'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </Modal>
  );
}
