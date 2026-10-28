import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '^/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '^/analytics': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '^/assessment-sessions': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '^/health': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '^/database-status': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'GBM CCLAS - La Ruta de Nina',
        short_name: 'CCLAS',
        start_url: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A192F',
        theme_color: '#0A192F',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
