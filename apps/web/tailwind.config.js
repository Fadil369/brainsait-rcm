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
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',
        'brainsait-midnight': '#1a365d',
        'brainsait-blue': '#2b6cb8',
        'brainsait-cyan': '#0ea5e9',
        'brainsait-violet': '#5b21b6',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 18px 45px rgba(14, 165, 233, 0.25)',
        neon: '0 0 0 1px rgba(14, 165, 233, 0.35), 0 25px 50px -20px rgba(14, 165, 233, 0.45)'
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      },
      backgroundImage: {
        'radial-spot': 'radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.2), transparent 60%)'
      }
    },
  },
  plugins: [],
}