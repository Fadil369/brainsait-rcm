# Quick Start Guide - BrainSAIT Design System

## For Developers

### Using Animation Primitives

```typescript
import { entrance, transition, listContainer, listItem } from '@/lib/animation-primitives'

// Simple fade in
<motion.div {...entrance.fadeIn} transition={transition.default}>
  Content
</motion.div>

// Slide up with delay
<motion.div
  variants={entrance.slideUp}
  transition={{ ...transition.default, delay: 0.2 }}
>
  Delayed content
</motion.div>

// Staggered list
<motion.ul variants={listContainer} initial="hidden" animate="show">
  {items.map(item => (
    <motion.li key={item.id} variants={listItem}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

### Using Toast Notifications

```typescript
import { toast } from '@/components/ui/Toast'

// Success notification
toast.success('Claim submitted', 'NPHIES-12345 processed')

// Error notification
toast.error('Validation failed', 'Check required fields', {
  duration: 7000, // longer for errors
})

// With custom options
toast.info('System maintenance', 'Scheduled for tonight', {
  position: 'bottom',
  duration: 0, // no auto-dismiss
})
```

### Using Skeleton Loaders

```typescript
import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'

// Loading state for text
{loading ? <Skeleton variant="text" className="w-1/2" /> : <h1>{title}</h1>}

// Loading state for cards
{loading ? <SkeletonCard /> : <Card {...data} />}

// Loading state for tables
{loading ? <SkeletonTable rows={10} /> : <Table data={data} />}
```

### Using Spinner

```typescript
import { Spinner, LoadingOverlay } from '@/components/ui/Spinner'

// Inline spinner
{loading && <Spinner size="sm" color="primary" />}

// Full page overlay
{loading && <LoadingOverlay message="Processing claim..." />}
```

### Using HeroGrid

```typescript
import { HeroGrid } from '@/components/home/HeroGrid'

<HeroGrid
  locale={locale}
  metrics={[
    {
      title: 'Total Claims',
      titleAr: 'إجمالي المطالبات',
      value: 1247,
      trend: '+15%',
      trendDirection: 'up',
      icon: '📊',
      sparklineData: [100, 120, 115, 135, 150, 145, 160],
      onClick: () => router.push('/claims'),
    },
    {
      title: 'Recovery Rate',
      titleAr: 'معدل الاسترداد',
      value: '87.3%',
      trend: '+2.1%',
      trendDirection: 'up',
      icon: '💰',
    },
  ]}
/>
```

### Using AlertBand

```typescript
import { AlertBand } from '@/components/home/AlertBand'

const alerts = [
  {
    id: 'alert-1',
    type: 'critical',
    title: 'Deadline Approaching',
    titleAr: 'اقتراب الموعد النهائي',
    message: 'Claim #12345 expires in 24 hours',
    messageAr: 'تنتهي صلاحية المطالبة #12345 خلال 24 ساعة',
    action: {
      label: 'Review',
      labelAr: 'مراجعة',
      onClick: () => handleReview(),
    },
  },
]

<AlertBand
  alerts={alerts}
  locale={locale}
  autoRotate={true}
  rotationInterval={8000}
/>
```

### Using Feature Flags

```typescript
import { featureFlagService, FEATURE_FLAGS } from '@/services/feature-flags'

// Check if feature is enabled
const showAcademy = await featureFlagService.isEnabled(
  FEATURE_FLAGS.ACADEMY,
  { userId: user.id, organizationId: user.orgId }
)

// Conditional rendering
{showAcademy && <AcademyLink />}

// Set flag (admin only)
await featureFlagService.setFlag({
  key: FEATURE_FLAGS.ACADEMY,
  enabled: true,
  rolloutPercentage: 25, // 25% of users
  description: 'BrainSAIT Academy Phase 2',
  createdAt: new Date(),
  updatedAt: new Date(),
})
```

### Using Content Adapter

```typescript
import { contentAdapter } from '@/lib/content/adapter'

// Get course data
const course = await contentAdapter.getCourse('rcm-foundations')

// Save user progress
await contentAdapter.saveProgress({
  userId: user.id,
  courseId: 'rcm-foundations',
  completedModules: ['module-1', 'module-2'],
  quizScores: { 'quiz-1': 95 },
  lastAccessedAt: new Date(),
})

// Get app integration
const app = await contentAdapter.getAppIntegration('payer-connect')
```

### Using Environment Config

```typescript
import { config } from '@/config/environment'

// API configuration
const response = await fetch(`${config.apiUrl}/claims`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
})

// Feature check
if (config.features.academy) {
  // Show academy features
}

// Environment-specific behavior
if (config.isDevelopment) {
  console.log('Debug mode enabled')
}
```

## Common Patterns

### Bilingual Content

```typescript
// Component with bilingual support
interface Props {
  title: string
  titleAr?: string
  locale: 'en' | 'ar'
}

function MyComponent({ title, titleAr, locale }: Props) {
  const displayTitle = locale === 'ar' && titleAr ? titleAr : title
  
  return (
    <h1 dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {displayTitle}
    </h1>
  )
}
```

### Glass Morphism Card

```typescript
<div className="
  rounded-xl border border-surface-border backdrop-blur-md
  bg-gradient-to-br from-surface-base/80 to-surface-strong/60
  p-6 shadow-ambient
  hover:border-accent/30 hover:shadow-glow
  transition-all duration-220
">
  Card content
</div>
```

### Responsive Grid

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Interactive Button

```typescript
import { motion } from 'framer-motion'
import { interaction, transition } from '@/lib/animation-primitives'

<motion.button
  whileHover={interaction.hover}
  whileTap={interaction.tap}
  transition={transition.fast}
  className="px-4 py-2 rounded-lg bg-accent text-white"
>
  Click me
</motion.button>
```

### Loading State Pattern

```typescript
function MyComponent() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchData().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton variant="rectangular" height={400} />
  if (!data) return <Alert type="error">No data found</Alert>
  
  return <DataView data={data} />
}
```

## Styling Best Practices

### Using cn() Utility

```typescript
import { cn } from '@/utils/cn'

function Button({ className, variant = 'primary', ...props }) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-colors',
        {
          'bg-accent text-white hover:bg-accent/90': variant === 'primary',
          'bg-secondary text-foreground hover:bg-secondary/80': variant === 'secondary',
        },
        className
      )}
      {...props}
    />
  )
}
```

### Tailwind Class Order

1. Layout (flex, grid, display)
2. Positioning (relative, absolute)
3. Sizing (w-, h-, min-, max-)
4. Spacing (m-, p-)
5. Typography (font-, text-, leading-)
6. Visual (bg-, border-, rounded-, shadow-)
7. Interactions (hover:, focus:, transition-)

Example:
```typescript
className="flex items-center justify-between w-full p-4 text-sm font-medium bg-surface-base border border-surface-border rounded-lg hover:bg-surface-strong transition-colors"
```

## Debugging Tips

### Animation Issues
```typescript
// Add visible border to see animation boundaries
<motion.div className="border-2 border-red-500" {...animation}>

// Slow down animations for debugging
transition={{ ...transition.default, duration: 2 }}
```

### Feature Flag Testing
```typescript
// Force enable in browser console
localStorage.setItem('brainsait:feature-flag:academy', JSON.stringify({
  key: 'academy',
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}))
```

### Toast Testing
```typescript
// Trigger from browser console
window.dispatchEvent(new CustomEvent('brainsait:toast', {
  detail: {
    id: 'test-' + Date.now(),
    type: 'success',
    title: 'Test Toast',
    message: 'This is a test',
  }
}))
```

## Performance Tips

### Lazy Load Heavy Components

```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Skeleton variant="rectangular" height={400} />,
  ssr: false,
})
```

### Memoize Expensive Calculations

```typescript
import { useMemo } from 'react'

const sparklineData = useMemo(() => {
  return processLargeDataset(rawData)
}, [rawData])
```

### Debounce User Input

```typescript
import { useDebounce } from '@/hooks/useDebounce'

const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 300)

useEffect(() => {
  if (debouncedSearch) {
    performSearch(debouncedSearch)
  }
}, [debouncedSearch])
```

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus visible on all focusable elements
- [ ] ARIA labels on icon-only buttons
- [ ] Alt text on all images
- [ ] Semantic HTML elements (nav, main, article)
- [ ] Color contrast ratio > 4.5:1
- [ ] Form fields have labels
- [ ] Error messages are descriptive
- [ ] Loading states announced to screen readers
- [ ] Modal focus trapped and returns on close

## Common Gotchas

### 1. Animation Variants
❌ Don't mix variants and explicit props:
```typescript
<motion.div variants={entrance.fadeIn} initial={{ x: 100 }} />
```

✅ Use one or the other:
```typescript
<motion.div {...entrance.fadeIn} />
// OR
<motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} />
```

### 2. Toast Positioning
❌ Multiple ToastContainers:
```typescript
<ToastContainer />
<ToastContainer /> // Creates duplicate toasts
```

✅ Single container in layout:
```typescript
// app/layout.tsx
<AppShell>{children}</AppShell>
<ToastContainer position="top-right" />
```

### 3. Feature Flag Caching
❌ Not clearing cache after flag update:
```typescript
await setFlag({ key: 'new-feature', enabled: true })
// Still returns old value due to cache
```

✅ Clear cache after updates:
```typescript
await setFlag({ key: 'new-feature', enabled: true })
featureFlagService.clearCache()
```

## Resources

- **Design Tokens:** `apps/web/src/lib/design-tokens.ts`
- **Animation Primitives:** `apps/web/src/lib/animation-primitives.ts`
- **Tailwind Config:** `apps/web/tailwind.config.js`
- **Environment Config:** `apps/web/src/config/environment.ts`
- **Full Documentation:** `DESIGN_SYSTEM_IMPLEMENTATION.md`
- **Deployment Guide:** `DEPLOYMENT_CHECKLIST.md`

## Getting Help

1. Check inline code comments
2. Review component examples in this guide
3. Check TypeScript types for prop definitions
4. Review test files for usage examples
5. Ask in team Slack channel #brainsait-dev

---

**Quick Start Guide Version:** 1.0.0
**Last Updated:** October 2024
