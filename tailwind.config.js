/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0B1220',
          surface: '#111A2E',
          panel: '#0F1726',
          elevated: '#15203A',
        },
        border: {
          DEFAULT: '#1E2A44',
          strong: '#2A3A5C',
        },
        accent: {
          cyan: '#22D3EE',
          teal: '#14B8A6',
        },
        state: {
          warning: '#F59E0B',
          danger: '#EF4444',
          success: '#10B981',
        },
        text: {
          primary: '#E5E7EB',
          muted: '#94A3B8',
          subtle: '#64748B',
        },
        plot: {
          conversion: '#22D3EE',
          temperature: '#F97316',
          hotspot: '#FACC15',
          A: '#EF4444',
          B: '#3B82F6',
          C: '#10B981',
          D: '#A855F7',
          I: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        glow: '0 0 0 3px rgba(34,211,238,0.18)',
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-slow': 'pulse-slow 2.4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
