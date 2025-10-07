export type ThemeMode = 'light' | 'dark';

export interface ColorScale {
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  secondary: string;
  secondaryForeground: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  surfaceBase: string;
  surfaceStrong: string;
  surfaceBorder: string;
}

export interface TypographyScale {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  display: string;
  mono?: string;
}

export interface RadiusScale {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
}

export interface ShadowScale {
  glow: string;
  neon: string;
  ambient: string;
  focus: string;
}

export interface MotionTokens {
  durationFast: string;
  durationDefault: string;
  durationSlow: string;
  ease: string;
}

export interface DesignTokenSet {
  mode: ThemeMode;
  colors: ColorScale;
  typography: TypographyScale;
  spacing: Record<string, string>;
  radii: RadiusScale;
  shadows: ShadowScale;
  motion: MotionTokens;
}

export const lightTokens: DesignTokenSet = {
  mode: 'light',
  colors: {
    background: '0 0% 100%',
    foreground: '217 33% 12%',
    muted: '210 20% 94%',
    mutedForeground: '215 15% 45%',
    accent: '217 65% 34%',
    accentForeground: '0 0% 100%',
    secondary: '210 20% 92%',
    secondaryForeground: '217 20% 15%',
    success: '157 71% 39%',
    warning: '32 94% 58%',
    danger: '358 82% 52%',
    info: '199 95% 51%',
    surfaceBase: '245 250 255',
    surfaceStrong: '226 232 240',
    surfaceBorder: 'rgba(10, 25, 47, 0.1)'
  },
  typography: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.5rem',
    display: '3rem',
    mono: '0.85rem'
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1.25rem',
    lg: '2rem',
    xl: '3rem',
    gutter: '1.75rem'
  },
  radii: {
    sm: '0.5rem',
    md: '0.875rem',
    lg: '1.25rem',
    xl: '1.75rem',
    '2xl': '2.5rem'
  },
  shadows: {
    glow: '0 18px 45px rgba(14, 165, 233, 0.22)',
    neon: '0 0 0 1px rgba(14, 165, 233, 0.35), 0 25px 50px -20px rgba(14, 165, 233, 0.45)',
    ambient: '0 24px 60px -32px rgba(10, 25, 47, 0.45)',
    focus: '0 0 0 3px rgba(244, 81, 30, 0.25)'
  },
  motion: {
    durationFast: '150ms',
    durationDefault: '220ms',
    durationSlow: '400ms',
    ease: 'cubic-bezier(0.16, 1, 0.3, 1)'
  }
};

export const darkTokens: DesignTokenSet = {
  mode: 'dark',
  colors: {
    background: '217 65% 6%',
    foreground: '210 40% 96%',
    muted: '217 27% 18%',
    mutedForeground: '217 19% 68%',
    accent: '14 91% 54%',
    accentForeground: '0 0% 100%',
    secondary: '217 33% 16%',
    secondaryForeground: '214 32% 88%',
    success: '157 75% 43%',
    warning: '32 94% 58%',
    danger: '358 82% 58%',
    info: '199 95% 51%',
    surfaceBase: '10 25 47',
    surfaceStrong: '15 32 64',
    surfaceBorder: 'rgba(148, 163, 184, 0.26)'
  },
  typography: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.5rem',
    display: '3rem',
    mono: '0.85rem'
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1.25rem',
    lg: '2rem',
    xl: '3rem',
    gutter: '1.75rem'
  },
  radii: {
    sm: '0.5rem',
    md: '0.875rem',
    lg: '1.25rem',
    xl: '1.75rem',
    '2xl': '2.5rem'
  },
  shadows: {
    glow: '0 40px 120px -60px rgba(14, 165, 233, 0.55)',
    neon: '0 0 0 1px rgba(14, 165, 233, 0.35), 0 25px 50px -20px rgba(14, 165, 233, 0.55)',
    ambient: '0 55px 140px -60px rgba(9, 17, 34, 0.85)',
    focus: '0 0 0 3px rgba(14, 165, 233, 0.35)'
  },
  motion: {
    durationFast: '150ms',
    durationDefault: '220ms',
    durationSlow: '400ms',
    ease: 'cubic-bezier(0.16, 1, 0.3, 1)'
  }
};

export const designTokens = {
  light: lightTokens,
  dark: darkTokens,
};
