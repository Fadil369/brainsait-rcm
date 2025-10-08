/**
 * Animation Primitives for BrainSAIT
 * 
 * Consistent animation tokens using Framer Motion and design system values.
 * Follows cubic-bezier(0.16, 1, 0.3, 1) easing for all transitions.
 */

import type { Transition, Variants } from 'framer-motion'

// ============================================================================
// DURATION & EASING (from design tokens)
// ============================================================================

export const duration = {
  fast: 0.15,
  default: 0.22,
  slow: 0.4,
  slower: 0.6,
} as const

export const ease = [0.16, 1, 0.3, 1] as const // cubic-bezier

export const transition: Record<string, Transition> = {
  fast: { duration: duration.fast, ease },
  default: { duration: duration.default, ease },
  slow: { duration: duration.slow, ease },
  slower: { duration: duration.slower, ease },
  spring: { type: 'spring', damping: 25, stiffness: 300 },
  springGentle: { type: 'spring', damping: 20, stiffness: 200 },
}

// ============================================================================
// ENTRANCE ANIMATIONS
// ============================================================================

export const entrance = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  slideUp: {
    initial: { y: 24, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -24, opacity: 0 },
  },
  
  slideDown: {
    initial: { y: -24, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 24, opacity: 0 },
  },
  
  slideLeft: {
    initial: { x: 24, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -24, opacity: 0 },
  },
  
  slideRight: {
    initial: { x: -24, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 24, opacity: 0 },
  },
  
  scaleIn: {
    initial: { scale: 0.92, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.92, opacity: 0 },
  },
  
  scaleUp: {
    initial: { scale: 0.85, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.05, opacity: 0 },
  },
  
  expandHeight: {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
  },
} as const

// ============================================================================
// INTERACTION ANIMATIONS
// ============================================================================

export const interaction = {
  tap: {
    scale: 0.97,
    transition: transition.fast,
  },
  
  hover: {
    scale: 1.02,
    transition: transition.default,
  },
  
  hoverLift: {
    y: -4,
    scale: 1.01,
    transition: transition.default,
  },
  
  focus: {
    scale: 1.01,
    transition: transition.fast,
  },
  
  press: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },
} as const

// ============================================================================
// PAGE TRANSITIONS
// ============================================================================

export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transition.default,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: transition.fast,
  },
}

// ============================================================================
// MODAL/DIALOG ANIMATIONS
// ============================================================================

export const modalVariants = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  dialog: {
    initial: { scale: 0.95, opacity: 0, y: 12 },
    animate: { scale: 1, opacity: 1, y: 0 },
    exit: { scale: 0.95, opacity: 0, y: 12 },
  },
  
  sheet: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },
  
  sheetLeft: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },
} as const

// ============================================================================
// LIST ANIMATIONS (Stagger)
// ============================================================================

export const listContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: transition.default,
  },
}

export const listItemHorizontal: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: transition.default,
  },
}

// ============================================================================
// NOTIFICATION ANIMATIONS
// ============================================================================

export const notificationVariants = {
  topRight: {
    initial: { x: 400, opacity: 0, scale: 0.9 },
    animate: { x: 0, opacity: 1, scale: 1 },
    exit: { x: 400, opacity: 0, scale: 0.9 },
  },
  
  topLeft: {
    initial: { x: -400, opacity: 0, scale: 0.9 },
    animate: { x: 0, opacity: 1, scale: 1 },
    exit: { x: -400, opacity: 0, scale: 0.9 },
  },
  
  bottom: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 100, opacity: 0 },
  },
  
  center: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
  },
} as const

// ============================================================================
// LOADING ANIMATIONS
// ============================================================================

export const spinnerVariants: Variants = {
  rotating: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

export const skeletonVariants: Variants = {
  shimmer: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

// ============================================================================
// RTL-AWARE ANIMATIONS
// ============================================================================

/**
 * Returns direction-aware animation variants based on locale
 */
export const getDirectionalVariants = (isRTL: boolean) => ({
  slideIn: isRTL ? entrance.slideLeft : entrance.slideRight,
  slideOut: isRTL ? entrance.slideRight : entrance.slideLeft,
})

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a stagger container with custom delay
 */
export const createStaggerContainer = (staggerDelay: number = 0.05): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.1,
    },
  },
})

/**
 * Creates a delayed animation variant
 */
export const withDelay = (variant: Variants, delay: number): Variants => {
  return Object.entries(variant).reduce((acc, [key, value]) => {
    if (typeof value === 'object' && 'transition' in value) {
      acc[key] = {
        ...value,
        transition: {
          ...(value.transition as Transition),
          delay,
        },
      }
    } else {
      acc[key] = value
    }
    return acc
  }, {} as any)
}

/**
 * Combines multiple animation variants
 */
export const combineVariants = (...variants: Variants[]): Variants => {
  return variants.reduce((acc, variant) => {
    Object.entries(variant).forEach(([key, value]) => {
      if (typeof value === 'object') {
        acc[key] = { ...acc[key], ...value }
      } else {
        acc[key] = value
      }
    })
    return acc
  }, {})
}
