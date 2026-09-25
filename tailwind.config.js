/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#060a12',
          900: '#0c1220',
          850: '#11192c',
          800: '#16223b',
          750: '#1c2c4d',
          700: '#23365f',
          600: '#324c85',
          500: '#4364ab',
          400: '#5e85d4',
          accent: '#00e5ff',
          neonCyan: '#06b6d4',
          neonEmerald: '#10b981',
          neonRose: '#f43f5e',
          neonAmber: '#f59e0b',
          neonPurple: '#a855f7'
        },
        navy: {
          50: '#f0f4f8',
          100: '#dce6f0',
          200: '#b8cde0',
          300: '#8aaac8',
          400: '#5a82a8',
          500: '#3d6b93',
          600: '#2d5278',
          700: '#223f5f',
          800: '#1a2f49',
          850: '#15263d',
          900: '#0f1f33',
          950: '#091322'
        },
        charcoal: {
          50: '#f7f7f8',
          100: '#ebebee',
          200: '#d7d7dd',
          300: '#b3b3bd',
          400: '#8a8a97',
          500: '#6b6b78',
          600: '#555563',
          700: '#44444f',
          800: '#2f2f38',
          900: '#1f1f26',
          950: '#141418'
        },
        brand: {
          DEFAULT: '#0c1220',
          accent: '#06b6d4'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      borderRadius: {
        lg2: '0.625rem',
        xl2: '0.875rem'
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 0 0 1px rgb(255 255 255 / 0.05)',
        cardhover: '0 4px 12px 0 rgb(0 0 0 / 0.4), 0 0 0 1px rgb(6 182 212 / 0.25)',
        cyber: '0 4px 20px -2px rgba(6, 182, 212, 0.12), 0 0 0 1px rgba(6, 182, 212, 0.15)',
        glowCyan: '0 0 15px -3px rgba(6, 182, 212, 0.35)',
        'glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.35)',
        glowEmerald: '0 0 15px -3px rgba(16, 185, 129, 0.35)',
        'glow-emerald': '0 0 15px -3px rgba(16, 185, 129, 0.35)',
        glowRose: '0 0 15px -3px rgba(244, 63, 94, 0.35)',
        'glow-rose': '0 0 15px -3px rgba(244, 63, 94, 0.35)',
        glowAmber: '0 0 15px -3px rgba(245, 158, 11, 0.35)',
        'glow-amber': '0 0 15px -3px rgba(245, 158, 11, 0.35)'
      }
    }
  },
  plugins: []
}
