/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#f4f5fb',
        panel: '#ffffff',
        panel2: '#ffffff',
        column: '#eef0f8',
        edge: '#e4e6f1',
        muted: '#6b7280',
        text: '#1e1e2e',
        accent: '#4f46e5',
        accenttint: '#eef0ff'
      }
    }
  },
  plugins: []
}
