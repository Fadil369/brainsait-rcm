/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@brainsait/rejection-tracker',
    '@brainsait/notification-service',
    '@brainsait/compliance-reporter'
  ],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  // Disable SWC minifier (use Babel instead)
  swcMinify: false,
  // Cloudflare Pages optimization
  output: 'export',
  images: {
    unoptimized: true, // Cloudflare will handle image optimization
  },
  trailingSlash: true,
}

module.exports = nextConfig