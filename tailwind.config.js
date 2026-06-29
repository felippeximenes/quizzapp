const { fontFamily } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B39E8',
          hover: '#2D2BC5',
          subtle: '#EEF0FF',
          foreground: '#FFFFFF',
          50: '#EEF0FF', 100: '#E0E3FF', 200: '#C7CAFE', 300: '#A5A9FF',
          400: '#7C7FFF', 500: '#5C5AED', 600: '#3B39E8', 700: '#2D2BC5',
          800: '#2220A0', 900: '#1B1980',
        },
        accent: {
          DEFAULT: '#22C55E',
          hover: '#16A34A',
          subtle: '#DCFCE7',
          foreground: '#FFFFFF',
          50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC',
          400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D',
          800: '#166534', 900: '#14532D',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        success: { DEFAULT: '#22C55E', foreground: '#FFFFFF', subtle: '#DCFCE7' },
        warning: { DEFAULT: '#F59E0B', foreground: '#FFFFFF', subtle: '#FFFBEB' },
        danger: { DEFAULT: '#EF4444', foreground: '#FFFFFF', subtle: '#FEF2F2' },
        info: { DEFAULT: '#0284C7', foreground: '#FFFFFF', subtle: '#F0F9FF' },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", ...fontFamily.sans],
        body: ["'DM Sans'", ...fontFamily.sans],
        mono: ["'JetBrains Mono'", "'Fira Code'", ...fontFamily.mono],
      },
      borderRadius: {
        xs: '2px', sm: '6px', DEFAULT: '10px', md: '10px',
        lg: '14px', xl: '20px', '2xl': '28px', full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.05)',
        sm: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.05)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.09), 0 4px 6px -2px rgba(0,0,0,0.05)',
        xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        '2xl': '0 25px 50px -12px rgba(0,0,0,0.15)',
        focus: '0 0 0 2px #fff, 0 0 0 4px rgba(59,57,232,0.5)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.05)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce-in': 'bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
