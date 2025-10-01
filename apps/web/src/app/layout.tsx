import type { Metadata } from 'next'
import { Inter, Cairo } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}