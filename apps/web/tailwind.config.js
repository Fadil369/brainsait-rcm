/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--color-background) / <alpha-value>)',
        foreground: 'hsl(var(--color-foreground) / <alpha-value>)',
        muted: 'hsl(var(--color-muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--color-muted-foreground) / <alpha-value>)',
        accent: 'hsl(var(--color-accent) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--color-accent-foreground) / <alpha-value>)',
        secondary: 'hsl(var(--color-secondary) / <alpha-value>)',
        'secondary-foreground': 'hsl(var(--color-secondary-foreground) / <alpha-value>)',
        success: 'hsl(var(--color-success) / <alpha-value>)',
        warning: 'hsl(var(--color-warning) / <alpha-value>)',
        danger: 'hsl(var(--color-danger) / <alpha-value>)',
        info: 'hsl(var(--color-info) / <alpha-value>)',
        'brand-navy': 'hsl(var(--brand-navy) / <alpha-value>)',
        'brand-orange': 'hsl(var(--brand-orange) / <alpha-value>)',
        'brand-gray': 'hsl(var(--brand-gray) / <alpha-value>)',
        'surface-base': 'rgb(var(--surface-base) / <alpha-value>)',
        'surface-strong': 'rgb(var(--surface-strong) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-manrope)', 'system-ui', 'sans-serif'],
        display: ['var(--font-manrope)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: 'var(--font-size-xs)',
        sm: 'var(--font-size-sm)',
        base: 'var(--font-size-md)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
        '2xl': 'calc(var(--font-size-xl) * 1.2)',
        '3xl': 'var(--font-size-display)',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        neon: 'var(--shadow-neon)',
        focus: 'var(--shadow-focus)',
        ambient: 'var(--shadow-ambient)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      spacing: {
        gutter: 'var(--space-gutter)',
        'space-xs': 'var(--space-xs)',
        'space-sm': 'var(--space-sm)',
        'space-md': 'var(--space-md)',
        'space-lg': 'var(--space-lg)',
        'space-xl': 'var(--space-xl)',
      },
      transitionTimingFunction: {
        relaxed: 'var(--motion-ease)',
      },
      transitionDuration: {
        fast: 'var(--motion-duration-fast)',
        DEFAULT: 'var(--motion-duration-default)',
        slow: 'var(--motion-duration-slow)',
      },
      backgroundImage: {
        'radial-spot': 'radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.2), transparent 60%)',
        grid: 'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}