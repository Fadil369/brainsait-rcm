/**
 * Environment Configuration
 * 
 * Centralized configuration for environment-specific settings.
 * Validates required environment variables at build/runtime.
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value!
}

function getBoolEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key]
  if (!value) return defaultValue
  return value === 'true' || value === '1' || value === 'yes'
}

export const config = {
  // Application
  env: getEnvVar('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  appName: 'BrainSAIT',
  appUrl: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  
  // API
  apiUrl: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:8000'),
  wsUrl: getEnvVar('NEXT_PUBLIC_WS_URL', 'ws://localhost:8000'),
  apiTimeout: parseInt(getEnvVar('API_TIMEOUT', '30000'), 10),
  
  // Authentication
  jwtSecret: getEnvVar('JWT_SECRET', 'dev-secret-change-in-production'),
  sessionDuration: parseInt(getEnvVar('SESSION_DURATION', '86400'), 10), // 24 hours
  
  // Database
  mongoUri: getEnvVar('MONGO_URI', 'mongodb://localhost:27017/brainsait'),
  redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  
  // Cloudflare (optional)
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
  kvNamespaceId: process.env.KV_NAMESPACE_ID,
  d1DatabaseId: process.env.D1_DATABASE_ID,
  
  // External Services
  nphiesApiUrl: process.env.NPHIES_API_URL,
  nphiesApiKey: process.env.NPHIES_API_KEY,
  nphiesEnabled: getBoolEnv('NEXT_PUBLIC_NPHIES_ENABLED', false),
  
  // Microsoft Teams Integration
  teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
  teamsEnabled: getBoolEnv('NEXT_PUBLIC_TEAMS_ENABLED', false),
  
  // WhatsApp Integration
  whatsappApiUrl: process.env.WHATSAPP_API_URL,
  whatsappApiKey: process.env.WHATSAPP_API_KEY,
  whatsappEnabled: getBoolEnv('NEXT_PUBLIC_WHATSAPP_ENABLED', false),
  
  // Analytics
  analyticsEnabled: getBoolEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', false),
  analyticsKey: process.env.NEXT_PUBLIC_ANALYTICS_KEY,
  
  // Monitoring
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sentryEnabled: getBoolEnv('NEXT_PUBLIC_SENTRY_ENABLED', false),
  
  // Feature Flags (default states, override with KV)
  features: {
    commandPalette: getBoolEnv('NEXT_PUBLIC_FEATURE_COMMAND_PALETTE', true),
    aiAgent: getBoolEnv('NEXT_PUBLIC_FEATURE_AI_AGENT', true),
    academy: getBoolEnv('NEXT_PUBLIC_FEATURE_ACADEMY', false),
    appStore: getBoolEnv('NEXT_PUBLIC_FEATURE_APP_STORE', false),
    partners: getBoolEnv('NEXT_PUBLIC_FEATURE_PARTNERS', false),
    realtimeAlerts: getBoolEnv('NEXT_PUBLIC_FEATURE_REALTIME_ALERTS', true),
    fraudDetection: getBoolEnv('NEXT_PUBLIC_FEATURE_FRAUD_DETECTION', true),
    predictiveAnalytics: getBoolEnv('NEXT_PUBLIC_FEATURE_PREDICTIVE_ANALYTICS', true),
  },
  
  // Performance
  enablePerformanceMonitoring: getBoolEnv('NEXT_PUBLIC_PERFORMANCE_MONITORING', true),
  enableCodeSplitting: getBoolEnv('ENABLE_CODE_SPLITTING', true),
  
  // Locale
  defaultLocale: getEnvVar('NEXT_PUBLIC_DEFAULT_LOCALE', 'en'),
  supportedLocales: ['en', 'ar'] as const,
  
  // Security
  encryptionKey: getEnvVar('ENCRYPTION_KEY', 'dev-encryption-key-change-me'),
  corsOrigins: getEnvVar('CORS_ORIGINS', '*').split(','),
  
  // Limits
  maxFileSize: parseInt(getEnvVar('MAX_FILE_SIZE', '10485760'), 10), // 10MB
  maxRequestSize: parseInt(getEnvVar('MAX_REQUEST_SIZE', '52428800'), 10), // 50MB
  rateLimit: parseInt(getEnvVar('RATE_LIMIT', '100'), 10), // requests per minute
  
  // Development
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Logging
  logLevel: getEnvVar('LOG_LEVEL', 'info'),
  enableDebugLogs: getBoolEnv('ENABLE_DEBUG_LOGS', false),
} as const

/**
 * Validate critical configuration at startup
 */
export function validateConfig(): void {
  const errors: string[] = []

  if (config.isProduction) {
    // Production-specific validations
    if (config.jwtSecret === 'dev-secret-change-in-production') {
      errors.push('JWT_SECRET must be changed in production')
    }
    if (config.encryptionKey === 'dev-encryption-key-change-me') {
      errors.push('ENCRYPTION_KEY must be changed in production')
    }
    if (!config.mongoUri.includes('mongodb')) {
      errors.push('Invalid MONGO_URI format')
    }
    if (config.nphiesEnabled && !config.nphiesApiKey) {
      errors.push('NPHIES_API_KEY required when NPHIES is enabled')
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`)
  }
}

// Validate on import in production
if (config.isProduction && typeof window === 'undefined') {
  validateConfig()
}

export type Config = typeof config
