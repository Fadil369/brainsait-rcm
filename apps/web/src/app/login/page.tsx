'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks';

/**
 * BrainSAIT Login Page
 * Authentication with bilingual support
 */

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [locale, setLocale] = useState<'ar' | 'en'>('en');
  const [error, setError] = useState('');

  const { login, loading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(
        locale === 'ar'
          ? 'فشل تسجيل الدخول. تحقق من بيانات الاعتماد.'
          : 'Login failed. Please check your credentials.'
      );
    }
  };

  const isRTL = locale === 'ar';

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-brainsait-midnight via-black to-brainsait-violet opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-tr from-brainsait-blue/20 via-transparent to-brainsait-cyan/20" />
      </div>

      {/* Language Toggle */}
      <button
        onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
        className="absolute top-6 right-6 z-20 glass-morphism px-4 py-2 rounded-lg text-white hover:scale-105 transition"
      >
        {locale === 'ar' ? 'English' : 'العربية'}
      </button>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-morphism rounded-2xl p-8">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🧠</div>
            <h1 className="text-3xl font-bold text-white mb-2">BrainSAIT</h1>
            <p className="text-gray-300">
              {locale === 'ar'
                ? 'نظام إدارة المطالبات التأمينية'
                : 'Insurance Claims Management System'
              }
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-lg
                         text-white focus:border-brainsait-cyan focus:outline-none transition"
                placeholder={locale === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter your email'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                {locale === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-lg
                         text-white focus:border-brainsait-cyan focus:outline-none transition"
                placeholder={locale === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password'}
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-brainsait-cyan to-brainsait-blue
                       text-white font-semibold rounded-lg hover:shadow-xl hover:scale-105
                       transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (locale === 'ar' ? 'جاري تسجيل الدخول...' : 'Logging in...')
                : (locale === 'ar' ? 'تسجيل الدخول' : 'Login')
              }
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-brainsait-blue/10 border border-brainsait-blue/30 rounded-lg">
            <p className="text-xs text-gray-400 text-center mb-2">
              {locale === 'ar' ? 'بيانات تجريبية:' : 'Demo credentials:'}
            </p>
            <p className="text-xs text-gray-300 text-center">
              admin@brainsait.com / admin123
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          {locale === 'ar'
            ? '© 2024 BrainSAIT Healthcare Solutions'
            : '© 2024 BrainSAIT Healthcare Solutions'
          }
        </p>
      </motion.div>
    </div>
  );
}
