/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B3904', // Verde mais escuro solicitado
          50: '#f0faf0',
          100: '#dcf5db',
          200: '#bbedba',
          300: '#87e184',
          400: '#4bcc46',
          500: '#1a7a0c',
          600: '#156a09',
          700: '#115807',
          800: '#0B3904', // Escuro principal
          900: '#072603',
        },
        danger: {
          DEFAULT: '#C41C1C',
          light: '#FEE2E2',
          dark: '#8B1111',
        },
        rls: {
          red: '#C41C1C',
          green: '#0B3904', // Verde mais escuro
        }
      },
      fontFamily: {
        sans: ['Mulish', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md': '0 4px 12px -2px rgb(0 0 0 / 0.08)',
        sidebar: '1px 0 0 0 #E5E7EB',
      }
    }
  },
  plugins: []
}
