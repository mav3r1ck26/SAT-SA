/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f172a',
          950: '#020617',
        },
        brand: {
          DEFAULT: '#4f46e5',
          accent: '#6366f1'
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
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        cardhover: '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 0 0 1px rgb(99 102 241 / 0.15)'
      }
    }
  },
  plugins: []
}
