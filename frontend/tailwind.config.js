/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F1EA',
        ink: '#1F1F1F',
        mustard: '#FFC233',
        terra: '#C65D3B',
        stone: '#D1D1C9',
        moss: '#5E6B4E',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        type: ['"Courier Prime"', 'ui-monospace', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
