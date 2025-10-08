/**
 * Content Adapter for KV/D1 backed content
 * 
 * Provides caching layer for Academy courses, App Store metadata,
 * and Partner directory information stored in Cloudflare KV/D1.
 */

export interface CourseData {
  id: string
  title: string
  titleAr?: string
  description: string
  descriptionAr?: string
  duration: string
  modules: CourseModule[]
  prerequisites?: string[]
  objectives: string[]
  objectivesAr?: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
}

export interface CourseModule {
  id: string
  title: string
  titleAr?: string
  content: string
  contentAr?: string
  videoUrl?: string
  duration: number // minutes
  quiz?: Quiz
}

export interface Quiz {
  questions: QuizQuestion[]
  passingScore: number
}

export interface QuizQuestion {
  id: string
  question: string
  questionAr?: string
  options: string[]
  optionsAr?: string[]
  correctAnswer: number
  explanation?: string
  explanationAr?: string
}

export interface UserProgress {
  userId: string
  courseId: string
  completedModules: string[]
  quizScores: Record<string, number>
  lastAccessedAt: Date
  completedAt?: Date
  certificateUrl?: string
}

export interface AppIntegration {
  id: string
  name: string
  nameAr?: string
  description: string
  descriptionAr?: string
  category: 'automation' | 'analytics' | 'collaboration' | 'integration'
  icon: string
  provider: string
  status: 'available' | 'coming-soon' | 'beta'
  pricing: 'free' | 'premium' | 'enterprise'
  features: string[]
  featuresAr?: string[]
  documentation?: string
  installUrl?: string
}

export interface PartnerOrganization {
  id: string
  name: string
  nameAr?: string
  type: 'hospital' | 'payer' | 'analytics' | 'technology'
  focus: string
  focusAr?: string
  status: 'active' | 'pending' | 'exploration'
  logoUrl?: string
  contactEmail?: string
  website?: string
  metrics?: {
    claimsProcessed?: number
    averageRecoveryRate?: number
    responseTime?: string
  }
}

/**
 * Content Adapter with KV/D1 integration
 */
export class ContentAdapter {
  private kvNamespace?: KVNamespace
  private d1Database?: D1Database
  private cachePrefix = 'brainsait:content:'
  private cacheTTL = 3600 // 1 hour

  constructor(kv?: KVNamespace, d1?: D1Database) {
    this.kvNamespace = kv
    this.d1Database = d1
  }

  // ============================================================================
  // ACADEMY CONTENT
  // ============================================================================

  async getCourse(courseId: string): Promise<CourseData | null> {
    const cacheKey = `${this.cachePrefix}course:${courseId}`
    
    // Try cache first (localStorage in browser, KV in edge)
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { data, expiry } = JSON.parse(cached)
        if (Date.now() < expiry) {
          return data
        }
      }
    } else if (this.kvNamespace) {
      const cached = await this.kvNamespace.get(cacheKey, 'json')
      if (cached) return cached as CourseData
    }

    // Fetch from KV or API
    const course = await this.fetchCourse(courseId)
    
    // Cache the result
    if (course) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: course, expiry: Date.now() + this.cacheTTL * 1000 })
        )
      } else if (this.kvNamespace) {
        await this.kvNamespace.put(cacheKey, JSON.stringify(course), {
          expirationTtl: this.cacheTTL,
        })
      }
    }

    return course
  }

  async getAllCourses(): Promise<CourseData[]> {
    // In production, this would query KV for course list
    // For now, return mock data
    return this.getMockCourses()
  }

  async getUserProgress(userId: string, courseId: string): Promise<UserProgress | null> {
    if (!this.d1Database) {
      // Fallback to localStorage
      const key = `${this.cachePrefix}progress:${userId}:${courseId}`
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : null
    }

    const result = await this.d1Database
      .prepare('SELECT * FROM user_progress WHERE user_id = ? AND course_id = ?')
      .bind(userId, courseId)
      .first<any>()

    if (!result) return null

    return {
      userId: result.user_id,
      courseId: result.course_id,
      completedModules: JSON.parse(result.completed_modules || '[]'),
      quizScores: JSON.parse(result.quiz_scores || '{}'),
      lastAccessedAt: new Date(result.last_accessed_at),
      completedAt: result.completed_at ? new Date(result.completed_at) : undefined,
      certificateUrl: result.certificate_url,
    }
  }

  async saveProgress(progress: UserProgress): Promise<void> {
    if (!this.d1Database) {
      // Fallback to localStorage
      const key = `${this.cachePrefix}progress:${progress.userId}:${progress.courseId}`
      localStorage.setItem(key, JSON.stringify(progress))
      return
    }

    await this.d1Database
      .prepare(`
        INSERT INTO user_progress (user_id, course_id, completed_modules, quiz_scores, last_accessed_at, completed_at, certificate_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, course_id) DO UPDATE SET
          completed_modules = excluded.completed_modules,
          quiz_scores = excluded.quiz_scores,
          last_accessed_at = excluded.last_accessed_at,
          completed_at = excluded.completed_at,
          certificate_url = excluded.certificate_url
      `)
      .bind(
        progress.userId,
        progress.courseId,
        JSON.stringify(progress.completedModules),
        JSON.stringify(progress.quizScores),
        progress.lastAccessedAt.toISOString(),
        progress.completedAt?.toISOString() || null,
        progress.certificateUrl || null
      )
      .run()
  }

  // ============================================================================
  // APP STORE
  // ============================================================================

  async getAppIntegration(appId: string): Promise<AppIntegration | null> {
    const cacheKey = `${this.cachePrefix}app:${appId}`
    
    if (this.kvNamespace) {
      const cached = await this.kvNamespace.get(cacheKey, 'json')
      if (cached) return cached as AppIntegration
    }

    // Fetch from source
    const app = await this.fetchApp(appId)
    
    if (app && this.kvNamespace) {
      await this.kvNamespace.put(cacheKey, JSON.stringify(app), {
        expirationTtl: this.cacheTTL,
      })
    }

    return app
  }

  async getAllApps(): Promise<AppIntegration[]> {
    return this.getMockApps()
  }

  // ============================================================================
  // PARTNERS
  // ============================================================================

  async getPartner(partnerId: string): Promise<PartnerOrganization | null> {
    const cacheKey = `${this.cachePrefix}partner:${partnerId}`
    
    if (this.kvNamespace) {
      const cached = await this.kvNamespace.get(cacheKey, 'json')
      if (cached) return cached as PartnerOrganization
    }

    const partner = await this.fetchPartner(partnerId)
    
    if (partner && this.kvNamespace) {
      await this.kvNamespace.put(cacheKey, JSON.stringify(partner), {
        expirationTtl: this.cacheTTL,
      })
    }

    return partner
  }

  async getAllPartners(): Promise<PartnerOrganization[]> {
    return this.getMockPartners()
  }

  // ============================================================================
  // PRIVATE METHODS - Mock data for development
  // ============================================================================

  private async fetchCourse(courseId: string): Promise<CourseData | null> {
    // In production, fetch from KV or API
    const courses = this.getMockCourses()
    return courses.find((c) => c.id === courseId) || null
  }

  private async fetchApp(appId: string): Promise<AppIntegration | null> {
    const apps = this.getMockApps()
    return apps.find((a) => a.id === appId) || null
  }

  private async fetchPartner(partnerId: string): Promise<PartnerOrganization | null> {
    const partners = this.getMockPartners()
    return partners.find((p) => p.id === partnerId) || null
  }

  private getMockCourses(): CourseData[] {
    return [
      {
        id: 'rcm-foundations',
        title: 'RCM Foundations for Hybrid Care Networks',
        titleAr: 'أساسيات إدارة دورة الإيرادات لشبكات الرعاية الهجينة',
        description: 'Overview of Saudi regulatory checkpoints, clinical hand-offs, and denial prevention best practices.',
        descriptionAr: 'نظرة عامة على نقاط التفتيش التنظيمية السعودية، التسليمات الإكلينيكية، وأفضل ممارسات منع الرفض.',
        duration: '90 min',
        difficulty: 'beginner',
        tags: ['RCM', 'Saudi Regulations', 'NPHIES'],
        modules: [],
        objectives: [
          'Understand Saudi healthcare regulatory framework',
          'Learn denial prevention strategies',
          'Master NPHIES integration requirements',
        ],
      },
    ]
  }

  private getMockApps(): AppIntegration[] {
    return [
      {
        id: 'payer-connect',
        name: 'Payer Collaboration Kit',
        nameAr: 'مجموعة التعاون مع شركات التأمين',
        description: 'Secure messaging templates, SLA tracking, and escalation guardrails for high-impact payers.',
        descriptionAr: 'قوالب رسائل آمنة، تتبع اتفاقيات مستوى الخدمة، وضوابط التصعيد لشركات التأمين ذات التأثير العالي.',
        category: 'collaboration',
        icon: '🤝',
        provider: 'BrainSAIT',
        status: 'available',
        pricing: 'premium',
        features: [
          'Secure messaging with payers',
          'SLA tracking and alerts',
          'Escalation workflows',
          'Audit trail',
        ],
      },
    ]
  }

  private getMockPartners(): PartnerOrganization[] {
    return [
      {
        id: 'payer-network',
        name: 'Gulf Payer Network',
        nameAr: 'شبكة شركات التأمين الخليجية',
        type: 'payer',
        focus: 'Unified APIs for remittance advice, status inquiries, and retroactive authorization workflows.',
        focusAr: 'واجهات برمجية موحدة للمشورة التحويلية، استفسارات الحالة، وسير العمل للترخيص بأثر رجعي.',
        status: 'active',
        metrics: {
          claimsProcessed: 125000,
          averageRecoveryRate: 87.3,
          responseTime: '2.4 days',
        },
      },
    ]
  }
}

// Export singleton instance for browser usage
export const contentAdapter = new ContentAdapter()

// Edge function types (for Cloudflare Workers)
declare global {
  interface KVNamespace {
    get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement
  }

  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement
    first<T = any>(): Promise<T | null>
    all<T = any>(): Promise<{ results: T[] }>
    run(): Promise<void>
  }
}
