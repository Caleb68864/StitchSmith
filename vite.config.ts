import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Cache all pre-built assets so the app works fully offline.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Bump this when deploying so stale caches are replaced.
        // vite-plugin-pwa appends a content-hash automatically in prod.
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'StitchSmith',
        short_name: 'StitchSmith',
        description: 'Pattern generator for sewists and crafters',
        theme_color: '#18181b',
        background_color: '#18181b',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5273,
    strictPort: true,
  },
  preview: {
    port: 5273,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    passWithNoTests: true,
  },
})
