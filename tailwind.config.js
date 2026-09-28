/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chess: {
          bg: '#161512',
          surface: '#21201d',
          surfaceLight: '#2b2926',
          panel: '#272522',
          border: '#3c3934',
          green: '#81b64c',
          greenHover: '#95c85d',
          greenDark: '#537a2e',
          text: '#ffffff',
          textMuted: '#9e9c98',
          textSubtle: '#666461',
        },
        board: {
          classic: {
            light: '#eeeed2',
            dark: '#769656',
            border: '#455933',
          },
          wood: {
            light: '#f0d9b5',
            dark: '#b58863',
            border: '#7c5535',
          },
          dark: {
            light: '#6b7280',
            dark: '#374151',
            border: '#1f2937',
          },
          glass: {
            light: '#334155',
            dark: '#1e293b',
            border: '#0f172a',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'board': '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'wall': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
        'pawn': '0 6px 12px -2px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-short': 'bounceShort 0.5s ease-in-out infinite',
      },
      keyframes: {
        bounceShort: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        }
      }
    },
  },
  plugins: [],
}
