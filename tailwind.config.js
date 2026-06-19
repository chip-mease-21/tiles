/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#f6f7f9',
        panel: '#ffffff',
        panel2: '#ffffff',
        column: '#eceff3',
        edge: '#e3e6ea',
        muted: '#6b7280',
        text: '#1f2937',
        accent: '#0d9488',
        accenttint: '#e6f6f4'
      }
    }
  },
  plugins: []
}
