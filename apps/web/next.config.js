/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@brainsait/rejection-tracker',
    '@brainsait/notification-service',
    '@brainsait/compliance-reporter'
  ],
  i18n: {
    locales: ['en', 'ar'],
    defaultLocale: 'en',
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  // Disable SWC minifier (use Babel instead)
  swcMinify: false,
  // Cloudflare Pages optimization
  output: 'standalone',
  images: {
    unoptimized: true, // Cloudflare will handle image optimization
  },
}

module.exports = nextConfig