/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
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
          950: '#0a1626'
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
          DEFAULT: '#0f1f33',
          accent: '#38bdf8'
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
        card: '0 1px 2px 0 rgb(15 23 42 / 0.05), 0 0 0 1px rgb(15 23 42 / 0.04)',
        cardhover: '0 2px 6px 0 rgb(15 23 42 / 0.08), 0 0 0 1px rgb(15 23 42 / 0.06)'
      }
    }
  },
  plugins: []
}
