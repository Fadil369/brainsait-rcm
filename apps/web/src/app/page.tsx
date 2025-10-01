'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { RejectionDashboard } from '@/components/RejectionDashboard'
import { useAuth } from '@/lib/hooks'
import type { Locale, UserRole } from '@brainsait/rejection-tracker'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [locale, setLocale] = useState<Locale>('en')
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('brainsait_locale')
    if (stored === 'ar' || stored === 'en') {
      setLocale(stored)
    }
    setInitialised(true)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  const handleLocaleChange = (value: Locale) => {
    setLocale(value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('brainsait_locale', value)
    }
  }

  if (loading || !initialised) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="text-white text-2xl font-semibold">Loading BrainSAIT dashboard...</div>
          <div className="w-64 h-1.5 bg-white/10 overflow-hidden rounded-full">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
              className="w-1/3 h-full bg-gradient-to-r from-brainsait-cyan to-brainsait-blue"
            />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const role = (user.role as UserRole) ?? 'ADMIN'
  const displayName = user.full_name ?? user.username ?? user.email ?? 'BrainSAIT'

  return (
    <main>
      <RejectionDashboard
        userRole={role}
        locale={locale}
        userName={displayName}
        onLocaleChange={handleLocaleChange}
      />
    </main>
  )
}
