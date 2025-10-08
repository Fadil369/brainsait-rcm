# Design System Implementation Roadmap

## Current State Assessment

### ✅ Completed
- **Design Tokens**: Comprehensive token set with light/dark themes (`design-tokens.ts`)
- **Tailwind Integration**: Full CSS variable integration with RTL awareness
- **Typography**: Inter, Manrope, Noto Sans Arabic fonts loaded with proper fallbacks
- **Layout Shell**: AppShell with bilingual navigation, theme toggle, account switcher
- **Basic UI Components**: Button, Card, Badge, Input, Select, Tabs, Textarea, Alert
- **Providers**: Theme, Auth, and Dashboard data context
- **RTL Support**: Bidirectional text handling with locale switching

### 🚧 In Progress / Outstanding

## Phase 1: Core UI Primitives & Animation System

### 1.1 Enhanced UI Primitive Library
Create production-ready, accessible component library:

**Priority Components:**
- [ ] **Spinner/Loader**: Consistent loading states
- [ ] **Skeleton**: Content loading placeholders
- [ ] **Toast**: Notification system
- [ ] **Popover**: Contextual overlays
- [ ] **Dropdown**: Enhanced select with keyboard nav
- [ ] **Dialog**: Modal wrapper with focus trap
- [ ] **Tooltip**: Accessible hover information
- [ ] **Progress**: Linear and circular indicators
- [ ] **Table**: Data grid with sorting/filtering
- [ ] **Pagination**: List navigation
- [ ] **Switch**: Toggle control
- [ ] **Checkbox**: Selection control
- [ ] **Radio**: Single-choice control
- [ ] **DatePicker**: Bilingual date selection
- [ ] **Combobox**: Searchable select

**Component Requirements:**
- Full ARIA support (keyboard navigation, screen readers)
- RTL/LTR aware positioning and animations
- Dark/light theme variants from design tokens
- Framer Motion animations following easing curves
- TypeScript with strict prop types
- Bilingual label/placeholder support

### 1.2 Animation Guidelines & Primitives

**Animation Token Implementation:**
```typescript
// apps/web/src/lib/animation-primitives.ts
export const animations = {
  // Entrances
  fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  slideUp: { initial: { y: 24, opacity: 0 }, animate: { y: 0, opacity: 1 } },
  slideDown: { initial: { y: -24, opacity: 0 }, animate: { y: 0, opacity: 1 } },
  scaleIn: { initial: { scale: 0.92, opacity: 0 }, animate: { scale: 1, opacity: 1 } },
  
  // Transitions
  duration: {
    fast: 0.15,
    default: 0.22,
    slow: 0.4,
  },
  ease: [0.16, 1, 0.3, 1], // cubic-bezier from tokens
  
  // Interactions
  tap: { scale: 0.97 },
  hover: { scale: 1.02 },
}
```

**Usage Patterns:**
- Page transitions: slideUp + fadeIn (220ms)
- Modal overlays: scaleIn (400ms)
- Drawer slides: slideUp (220ms)
- Micro-interactions: tap/hover (150ms)
- List stagger: 50ms delay between items

## Phase 2: Homepage Enhancements

### 2.1 Hero Grid Layout
**Components to Build:**
- `apps/web/src/components/home/HeroGrid.tsx`
  - 3-column adaptive grid (2-col tablet, 1-col mobile)
  - Glass morphism cards with neural mesh backgrounds
  - Live metric counters with animation on mount
  - Quick action buttons (Create Claim, View Rejections, Run Report)

**Design Specs:**
```typescript
// Grid structure
<HeroGrid>
  <MetricCard title="Claims Under Review" value={124} trend="+12%" />
  <MetricCard title="Recovery Rate" value="87.3%" trend="+5.2%" />
  <MetricCard title="Compliance Score" value="94/100" trend="+2" />
</HeroGrid>
```

### 2.2 Realtime Alert Band
**Component:**
- `apps/web/src/components/home/AlertBand.tsx`
  - Sticky banner below metric ribbon
  - Auto-rotating carousel of critical alerts
  - Dismissable with localStorage persistence
  - WebSocket integration for live updates

**Alert Types:**
- 🔴 Critical: Deadline exceeded (< 24h remaining)
- 🟡 Warning: Approaching deadline (< 72h)
- 🔵 Info: New payer remittance received
- 🟢 Success: Appeal recovered

### 2.3 Sparkline-Rich Metric Cards
**Enhanced Card Component:**
- `apps/web/src/components/ui/SparklineCard.tsx`
  - Mini chart visualization (30-day trend)
  - Hover tooltip with date/value
  - Performance optimized (Canvas or SVG)
  - Bilingual axis labels

**Data Integration:**
```typescript
// Use existing dashboardSeries utilities
import { buildSparklineGeometry } from '@/utils/dashboardSeries'
```

### 2.4 Grouped Table Sections
**Dashboard Sections:**
- Recent Rejections (last 7 days)
- High-Value Claims (> 50k SAR)
- Physician Flagged Items (fraud risk)
- Pending Appeals (awaiting response)

**Features:**
- Column sorting with direction indicator
- Row selection with bulk actions
- Expandable details row
- Export to Excel button
- Bilingual column headers

## Phase 3: Phase 2 Module Scaffolding

### 3.1 App Store
**Route:** `/app-store`
**Components:**
```
apps/web/src/app/app-store/
  ├── page.tsx           # Main catalog view
  ├── [appId]/
  │   └── page.tsx       # App detail page
  └── layout.tsx         # Store-specific layout
```

**Features:**
- Integration marketplace (NPHIES, Payers, HIS)
- Installed vs. available apps
- One-click activation with OAuth flow
- Usage metrics per integration

### 3.2 Academy
**Route:** `/academy`
**Components:**
```
apps/web/src/app/academy/
  ├── page.tsx           # Course catalog
  ├── [courseId]/
  │   └── page.tsx       # Course detail
  └── progress/
      └── page.tsx       # Learning progress
```

**Features:**
- NPHIES compliance training modules
- Coding best practices (ICD-10, CPT)
- Video content with Arabic subtitles
- Quiz assessments
- Certificate generation

### 3.3 Partners
**Route:** `/partners`
**Components:**
```
apps/web/src/app/partners/
  ├── page.tsx           # Partner directory
  ├── [partnerId]/
  │   └── page.tsx       # Partner profile
  └── invites/
      └── page.tsx       # Pending invitations
```

**Features:**
- Hospital network management
- Performance benchmarking
- Shared analytics dashboard
- Collaboration channels

### 3.4 Content Adapters (KV/D1)
**Infrastructure:**
```typescript
// apps/web/src/lib/content/
export class ContentAdapter {
  // Cloudflare KV for course content
  async getCourseData(courseId: string): Promise<CourseData>
  
  // D1 for user progress tracking
  async saveProgress(userId: string, courseId: string, progress: number)
  
  // Cache with SWR for performance
}
```

## Phase 4: Experience Enhancements

### 4.1 Command Palette Enhancement
**Current:** Basic CommandPalette.tsx exists
**Enhancements:**
- Fuzzy search across all entities (claims, rejections, physicians)
- Recent actions history
- Quick actions (create, export, search)
- Keyboard shortcuts (Cmd+K)
- Bilingual command labels

### 4.2 MCP/A2A Agent Overlay
**Component:** AgentOverlay.tsx (exists, needs enhancement)
**Features:**
- Natural language query interface
- Context-aware suggestions
- Chart generation from prompts
- Export capabilities
- Conversation history

### 4.3 Performance Instrumentation

**Code Splitting:**
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['framer-motion', '@paper-design/shaders-react'],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
      },
    }
    return config
  },
}
```

**Streamed Loaders:**
```typescript
// Use React Suspense boundaries
<Suspense fallback={<DashboardSkeleton />}>
  <DashboardContent />
</Suspense>
```

**Analytics Integration:**
```typescript
// apps/web/src/lib/analytics.ts
export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    // Posthog or Mixpanel integration
  },
  page: (name: string) => {
    // Page view tracking
  },
  identify: (userId: string, traits?: Record<string, any>) => {
    // User identification
  },
}
```

## Phase 5: Integration & Deployment

### 5.1 Shared Model Alignment
**Goal:** Sync TypeScript types across monorepo
```bash
# Generate shared types from backend schemas
npm run codegen:types

# Validate schema compatibility
npm run validate:schemas
```

### 5.2 Environment-Aware Configs
```typescript
// apps/web/src/config/environment.ts
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
  wsUrl: process.env.NEXT_PUBLIC_WS_URL!,
  nphiesEnabled: process.env.NEXT_PUBLIC_NPHIES_ENABLED === 'true',
  analyticsKey: process.env.NEXT_PUBLIC_ANALYTICS_KEY,
  
  // Feature flags from KV
  features: {
    commandPalette: true,
    aiAgent: true,
    academy: false, // Toggle via admin panel
  },
}
```

### 5.3 KV-Driven Feature Toggles
```typescript
// services/feature-flags/index.ts
export class FeatureFlagService {
  async isEnabled(flag: string, userId?: string): Promise<boolean> {
    // Check KV for global + user-specific overrides
    const global = await env.KV.get(`feature:${flag}`)
    const user = userId ? await env.KV.get(`feature:${flag}:${userId}`) : null
    return user !== null ? user === 'true' : global === 'true'
  }
  
  async setFlag(flag: string, enabled: boolean): Promise<void> {
    await env.KV.put(`feature:${flag}`, enabled.toString())
  }
}
```

### 5.4 Updated Rollout Documentation
**Deployment Checklist:** See DEPLOYMENT_CHECKLIST.md
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Redis cache warmed
- [ ] Feature flags set
- [ ] Monitoring alerts configured
- [ ] SSL certificates valid
- [ ] CDN cache purged
- [ ] Health checks passing

## Implementation Priority

### Week 1-2: Foundation
1. Complete UI primitive library (Spinner, Toast, Dialog, Table)
2. Implement animation primitives module
3. Add Storybook for component documentation

### Week 3-4: Homepage Polish
1. Build HeroGrid with live metrics
2. Implement AlertBand with WebSocket
3. Create SparklineCard component
4. Add grouped table sections

### Week 5-6: Phase 2 Scaffolding
1. App Store routes and basic UI
2. Academy structure with mock content
3. Partners directory scaffolding
4. Content adapter infrastructure

### Week 7-8: Enhancements
1. Enhanced command palette
2. Performance instrumentation
3. Feature flag system
4. Analytics integration

## Testing Strategy
- Unit tests: Jest + React Testing Library
- Integration tests: Playwright for critical flows
- Visual regression: Chromatic or Percy
- Performance: Lighthouse CI in GitHub Actions
- Accessibility: axe-core automated scans

## Success Metrics
- **Performance:** LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Accessibility:** WCAG 2.1 AA compliance (axe score > 95)
- **Code Quality:** TypeScript strict mode, 0 lint errors
- **Bundle Size:** First load JS < 200kb gzipped
- **Test Coverage:** > 80% for critical paths

## Documentation Deliverables
- Component usage guide (Storybook)
- Animation guidelines document
- Contribution guide for new features
- Deployment runbook
- Feature flag management guide
