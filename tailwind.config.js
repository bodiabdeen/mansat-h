export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // PROF | بروف brand palette — overrides Tailwind's default indigo scale
      // so every existing `indigo-*` class across the app repaints in brand
      // navy without touching each component. Anchor hexes (500/900) are
      // sampled straight from the 2026-08 brand board (mountain/arrow mark on
      // a deep navy plate); the rest are interpolated to keep a smooth
      // light→dark progression.
      colors: {
        indigo: {
          50: '#EEF2FB',
          100: '#DCE6F5',
          200: '#B6C9E8',
          300: '#8AA8D6',
          400: '#5C82BE',
          500: '#3B62A0',
          600: '#2A4A7E',
          700: '#1D375F',
          800: '#142842',
          900: '#0C1B2E',
          950: '#06101B',
        },
        gold: {
          50: '#FBF6E7',
          100: '#F5EBD1',
          400: '#E0C15C',
          500: '#D4AF37',
          600: '#B8952B',
          700: '#8F7220',
        },
      },
      fontFamily: {
        sans: ['Cairo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
