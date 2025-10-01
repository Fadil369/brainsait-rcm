'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { usePredictiveAnalytics } from '@/lib/hooks';
import { motion } from 'framer-motion';

interface PredictiveAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: 'ar' | 'en';
}

export function PredictiveAnalyticsModal({ isOpen, onClose, locale }: PredictiveAnalyticsModalProps) {
  const { predictions, loading, error, predict } = usePredictiveAnalytics();
  const [forecastDays, setForecastDays] = useState('30');

  const handlePredict = async () => {
    // Mock historical data - in real app, fetch from API
    const historicalData = Array.from({ length: 90 }, (_, i) => ({
      date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rejection_rate: 15 + Math.random() * 10,
      claim_count: 100 + Math.floor(Math.random() * 50)
    }));

    await predict(historicalData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === 'ar' ? '📈 التحليلات التنبؤية' : '📈 Predictive Analytics'}
      locale={locale}
      size="lg"
    >
      <div className="space-y-6">
        {/* Input Section */}
        {!predictions && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'عدد أيام التنبؤ' : 'Forecast Period (Days)'}
              </label>
              <select
                value={forecastDays}
                onChange={(e) => setForecastDays(e.target.value)}
                className="w-full px-4 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:border-brainsait-cyan focus:outline-none"
              >
                <option value="7">7 {locale === 'ar' ? 'أيام' : 'days'}</option>
                <option value="14">14 {locale === 'ar' ? 'يوم' : 'days'}</option>
                <option value="30">30 {locale === 'ar' ? 'يوم' : 'days'}</option>
                <option value="60">60 {locale === 'ar' ? 'يوم' : 'days'}</option>
                <option value="90">90 {locale === 'ar' ? 'يوم' : 'days'}</option>
              </select>
            </div>

            <div className="p-4 bg-brainsait-blue/10 border border-brainsait-blue/30 rounded-lg">
              <p className="text-sm text-gray-300">
                {locale === 'ar'
                  ? 'يستخدم هذا التحليل بيانات الـ 90 يومًا الماضية للتنبؤ بمعدلات الرفض وحجم المطالبات المستقبلية.'
                  : 'This analysis uses the last 90 days of data to forecast future rejection rates and claim volumes.'
                }
              </p>
            </div>

            <button
              onClick={handlePredict}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-brainsait-cyan to-brainsait-blue text-white rounded-lg hover:shadow-xl transition disabled:opacity-50"
            >
              {loading
                ? (locale === 'ar' ? '🔄 جاري التحليل...' : '🔄 Analyzing...')
                : (locale === 'ar' ? '🚀 إنشاء التنبؤات' : '🚀 Generate Forecasts')
              }
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
            {locale === 'ar' ? 'فشل التحليل التنبؤي' : 'Predictive analysis failed'}
          </div>
        )}

        {/* Results */}
        {predictions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-morphism p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">
                  {locale === 'ar' ? 'معدل الرفض المتوقع' : 'Predicted Rejection Rate'}
                </div>
                <div className="text-2xl font-bold text-orange-400">
                  {predictions.predicted_rejection_rate ? `${predictions.predicted_rejection_rate.toFixed(1)}%` : 'N/A'}
                </div>
                {predictions.trend && (
                  <div className={`text-sm mt-1 ${predictions.trend === 'increasing' ? 'text-red-400' : 'text-green-400'}`}>
                    {predictions.trend === 'increasing' ? '↗️ ' : '↘️ '}
                    {locale === 'ar' ? (predictions.trend === 'increasing' ? 'متزايد' : 'منخفض') : predictions.trend}
                  </div>
                )}
              </div>

              <div className="glass-morphism p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">
                  {locale === 'ar' ? 'حجم المطالبات المتوقع' : 'Predicted Claim Volume'}
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {predictions.predicted_claim_volume || 'N/A'}
                </div>
              </div>

              <div className="glass-morphism p-4 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">
                  {locale === 'ar' ? 'معدل الاسترداد المتوقع' : 'Predicted Recovery Rate'}
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {predictions.predicted_recovery_rate ? `${predictions.predicted_recovery_rate.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Forecast Chart (Simplified) */}
            {predictions.forecast && predictions.forecast.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {locale === 'ar' ? '📊 التنبؤات اليومية' : '📊 Daily Forecasts'}
                </h3>
                <div className="glass-morphism p-4 rounded-lg max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {predictions.forecast.slice(0, 10).map((day: any, index: number) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700/50">
                        <span className="text-gray-300 text-sm">{day.date}</span>
                        <div className="flex gap-4">
                          <span className="text-orange-400 text-sm">
                            {locale === 'ar' ? 'رفض' : 'Rej'}: {day.rejection_rate ? day.rejection_rate.toFixed(1) : 'N/A'}%
                          </span>
                          <span className="text-blue-400 text-sm">
                            {locale === 'ar' ? 'حجم' : 'Vol'}: {day.claim_count || 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {predictions.recommendations && predictions.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {locale === 'ar' ? '💡 التوصيات' : '💡 Recommendations'}
                </h3>
                <div className="space-y-3">
                  {predictions.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="glass-morphism p-4 rounded-lg">
                      <p className="text-gray-300 text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4 border-t border-gray-700">
              <button
                onClick={() => {}}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                {locale === 'ar' ? '📥 تصدير' : '📥 Export'}
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
