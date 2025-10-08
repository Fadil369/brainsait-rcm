import type { Metadata } from 'next'
import { Inter, Manrope, Noto_Sans_Arabic } from 'next/font/google'

import './globals.css'
import { AppShell } from '@/components/layout/AppShell'
import { ToastContainer } from '@/components/ui/Toast'
import { AuthProvider } from '@/lib/auth/context'
import { DashboardDataProvider } from '@/providers/DashboardDataProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', weight: ['400', '500', '600', '700'] })
const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  weight: ['400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'BrainSAIT - Healthcare Claims Management',
  description: 'Comprehensive medical insurance claims and rejections management platform',
  keywords: ['healthcare', 'claims', 'NPHIES', 'Saudi Arabia', 'medical insurance'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} ${notoSansArabic.variable} font-sans antialiased`}>
        <ThemeProvider locale="en" defaultTheme="dark">
          <AuthProvider>
            <DashboardDataProvider>
              <AppShell>{children}</AppShell>
              <ToastContainer position="top-right" />
            </DashboardDataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}