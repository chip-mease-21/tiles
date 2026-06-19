import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base ('./') for production so the app works under any GitHub Pages
// subfolder (e.g. /tiles/). Local dev stays at '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  server: {
    host: true,
    allowedHosts: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Tiles',
        short_name: 'Tiles',
        description: 'Tag-driven idea and task board',
        theme_color: '#0d9488',
        background_color: '#f6f7f9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: null,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
}))
