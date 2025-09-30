'use client'

import { RejectionDashboard } from '@/components/RejectionDashboard'
import { useState } from 'react'

export default function Home() {
  const [locale, setLocale] = useState<'ar' | 'en'>('en')

  return (
    <main>
      <RejectionDashboard
        userRole="ADMIN"
        locale={locale}
      />
    </main>
  )
}