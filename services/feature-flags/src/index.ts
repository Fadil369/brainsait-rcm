/**
 * Feature Flag Service with Cloudflare KV Storage
 * 
 * Provides runtime feature toggles with user-level overrides.
 * Enables gradual rollouts and A/B testing without deployments.
 */

export interface FeatureFlag {
  key: string
  enabled: boolean
  description?: string
  rolloutPercentage?: number
  allowedUsers?: string[]
  allowedOrganizations?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface FeatureFlagContext {
  userId?: string
  organizationId?: string
  role?: string
  environment?: 'development' | 'staging' | 'production'
}

export class FeatureFlagService {
  private kvNamespace?: KVNamespace
  private cachePrefix = 'brainsait:feature-flag:'
  private cacheTTL = 300 // 5 minutes for feature flags
  private memoryCache = new Map<string, { value: boolean; expiry: number }>()

  constructor(kv?: KVNamespace) {
    this.kvNamespace = kv
  }

  /**
   * Check if a feature flag is enabled for a given context
   */
  async isEnabled(flagKey: string, context?: FeatureFlagContext): Promise<boolean> {
    // Check memory cache first
    const cached = this.memoryCache.get(flagKey)
    if (cached && Date.now() < cached.expiry) {
      return this.evaluateFlag(cached.value, context)
    }

    // Get flag from KV or localStorage
    const flag = await this.getFlag(flagKey)
    if (!flag) {
      // Default to disabled if flag doesn't exist
      return false
    }

    // Cache in memory
    this.memoryCache.set(flagKey, {
      value: flag.enabled,
      expiry: Date.now() + this.cacheTTL * 1000,
    })

    return this.evaluateFlag(flag.enabled, context, flag)
  }

  /**
   * Get feature flag details
   */
  async getFlag(flagKey: string): Promise<FeatureFlag | null> {
    const cacheKey = `${this.cachePrefix}${flagKey}`

    if (this.kvNamespace) {
      try {
        const data = await this.kvNamespace.get(cacheKey, 'json')
        return data as FeatureFlag | null
      } catch (error) {
        console.error(`Failed to get feature flag ${flagKey}:`, error)
        return null
      }
    }

    // Fallback to localStorage in browser
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(cacheKey)
      return stored ? JSON.parse(stored) : null
    }

    return null
  }

  /**
   * Set or update a feature flag (admin only)
   */
  async setFlag(flag: FeatureFlag): Promise<void> {
    const cacheKey = `${this.cachePrefix}${flag.key}`
    
    // Update timestamp
    flag.updatedAt = new Date()
    if (!flag.createdAt) {
      flag.createdAt = new Date()
    }

    if (this.kvNamespace) {
      await this.kvNamespace.put(cacheKey, JSON.stringify(flag))
    } else if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(flag))
    }

    // Clear memory cache
    this.memoryCache.delete(flag.key)
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(flagKey: string): Promise<void> {
    const cacheKey = `${this.cachePrefix}${flagKey}`
    
    if (this.kvNamespace) {
      await this.kvNamespace.delete(cacheKey)
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem(cacheKey)
    }

    this.memoryCache.delete(flagKey)
  }

  /**
   * List all feature flags
   */
  async listFlags(): Promise<FeatureFlag[]> {
    if (this.kvNamespace) {
      // In production, use KV list operation
      const list = await this.kvNamespace.list({ prefix: this.cachePrefix })
      const flags: FeatureFlag[] = []
      
      for (const key of list.keys) {
        const flag = await this.kvNamespace.get(key.name, 'json')
        if (flag) {
          flags.push(flag as FeatureFlag)
        }
      }
      
      return flags
    }

    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const flags: FeatureFlag[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(this.cachePrefix)) {
          const value = localStorage.getItem(key)
          if (value) {
            flags.push(JSON.parse(value))
          }
        }
      }
      return flags
    }

    return []
  }

  /**
   * Evaluate flag based on context and rollout rules
   */
  private evaluateFlag(
    baseEnabled: boolean,
    context?: FeatureFlagContext,
    flag?: FeatureFlag
  ): boolean {
    if (!baseEnabled) return false
    if (!context) return baseEnabled

    // Check user-specific override
    if (context.userId && flag?.allowedUsers?.includes(context.userId)) {
      return true
    }

    // Check organization-specific override
    if (context.organizationId && flag?.allowedOrganizations?.includes(context.organizationId)) {
      return true
    }

    // Check rollout percentage
    if (flag?.rolloutPercentage !== undefined) {
      const hash = this.hashUserId(context.userId || '')
      const percentage = (hash % 100) + 1
      return percentage <= flag.rolloutPercentage
    }

    return baseEnabled
  }

  /**
   * Simple hash function for consistent user bucketing
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i)
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.memoryCache.clear()
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService()

// Predefined feature flags for BrainSAIT
export const FEATURE_FLAGS = {
  COMMAND_PALETTE: 'command-palette',
  AI_AGENT: 'ai-agent',
  ACADEMY: 'academy',
  APP_STORE: 'app-store',
  PARTNERS: 'partners',
  REALTIME_ALERTS: 'realtime-alerts',
  FRAUD_DETECTION: 'fraud-detection',
  PREDICTIVE_ANALYTICS: 'predictive-analytics',
  WHATSAPP_INTEGRATION: 'whatsapp-integration',
  TEAMS_INTEGRATION: 'teams-integration',
  NPHIES_INTEGRATION: 'nphies-integration',
  EXPORT_EXCEL: 'export-excel',
  AUDIT_TRAIL: 'audit-trail',
  MULTI_LANGUAGE: 'multi-language',
  DARK_MODE: 'dark-mode',
  PERFORMANCE_MONITORING: 'performance-monitoring',
} as const

/**
 * Initialize default feature flags
 */
export async function initializeFeatureFlags(service: FeatureFlagService): Promise<void> {
  const defaultFlags: Partial<FeatureFlag>[] = [
    {
      key: FEATURE_FLAGS.COMMAND_PALETTE,
      enabled: true,
      description: 'Enable command palette (Cmd+K)',
    },
    {
      key: FEATURE_FLAGS.AI_AGENT,
      enabled: true,
      description: 'Enable AI agent overlay for natural language queries',
    },
    {
      key: FEATURE_FLAGS.ACADEMY,
      enabled: false,
      description: 'Enable BrainSAIT Academy (Phase 2)',
      rolloutPercentage: 0,
    },
    {
      key: FEATURE_FLAGS.APP_STORE,
      enabled: false,
      description: 'Enable App Store integrations marketplace (Phase 2)',
      rolloutPercentage: 0,
    },
    {
      key: FEATURE_FLAGS.PARTNERS,
      enabled: false,
      description: 'Enable Partners directory (Phase 2)',
      rolloutPercentage: 0,
    },
    {
      key: FEATURE_FLAGS.REALTIME_ALERTS,
      enabled: true,
      description: 'Enable real-time alert band on dashboard',
    },
    {
      key: FEATURE_FLAGS.FRAUD_DETECTION,
      enabled: true,
      description: 'Enable fraud detection analytics',
    },
    {
      key: FEATURE_FLAGS.PREDICTIVE_ANALYTICS,
      enabled: true,
      description: 'Enable predictive analytics dashboard',
    },
    {
      key: FEATURE_FLAGS.MULTI_LANGUAGE,
      enabled: true,
      description: 'Enable Arabic/English language switching',
    },
    {
      key: FEATURE_FLAGS.DARK_MODE,
      enabled: true,
      description: 'Enable dark mode theme toggle',
    },
  ]

  for (const flagData of defaultFlags) {
    const existing = await service.getFlag(flagData.key!)
    if (!existing) {
      await service.setFlag({
        ...flagData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as FeatureFlag)
    }
  }
}

// Cloudflare KV types
declare global {
  interface KVNamespace {
    get(key: string, type?: 'text' | 'json'): Promise<any>
    put(key: string, value: string): Promise<void>
    delete(key: string): Promise<void>
    list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>
  }
}
