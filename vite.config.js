import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/*.png'],
      manifest: {
        name: 'BudgetApp',
        short_name: 'BudgetApp',
        description: 'Gérez vos finances personnelles simplement et en toute sécurité',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/mon-budget/',
        start_url: '/mon-budget/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/mon-budget/index.html',
        navigateFallbackDenylist: [/^\/__/],
      },
    }),
  ],
  // Base path pour GitHub Pages : https://juny31.github.io/mon-budget
  base: '/mon-budget/',
  server: {
    host: true,   // expose sur le réseau local (0.0.0.0)
    port: 5173,
  },
})
