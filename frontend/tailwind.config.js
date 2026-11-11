/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mars: {
          950: '#0B0D13',
          900: '#111520',
          850: '#161D2E',
          800: '#1C253B',
          700: '#283552',
          600: '#3A4C73',
          red: {
            DEFAULT: '#E24A2D',
            bright: '#FF5733',
            glow: '#FF3B1D',
            dark: '#8C1F0E',
            muted: '#4A1D16'
          },
          amber: {
            DEFAULT: '#F59E0B',
            bright: '#FBBF24',
            dark: '#B45309'
          },
          ice: {
            DEFAULT: '#38BDF8',
            bright: '#7DD3FC',
            glow: '#00F0FF',
            deep: '#0369A1'
          },
          green: {
            DEFAULT: '#10B981',
            bright: '#34D399',
            glow: '#00FF9D'
          }
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Space Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Rajdhani"', '"Orbitron"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'hud-red': '0 0 15px rgba(226, 74, 45, 0.35), inset 0 0 15px rgba(226, 74, 45, 0.1)',
        'hud-ice': '0 0 15px rgba(56, 189, 248, 0.35), inset 0 0 15px rgba(56, 189, 248, 0.1)',
        'hud-amber': '0 0 15px rgba(245, 158, 11, 0.35)',
        'hud-panel': '0 8px 32px 0 rgba(0, 0, 0, 0.7)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
