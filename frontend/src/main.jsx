import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// En modo desarrollo o en rutas de dashboard (/datos, /admin, /qr), desregistra cualquier
// Service Worker antiguo (como cclas-nina-v1 o Workbox) y limpia las cachés para evitar
// que sirva el index.html estático de Nina en caché.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isDashboardRoute =
    window.location.pathname.startsWith('/datos') ||
    window.location.pathname.startsWith('/admin') ||
    window.location.pathname.startsWith('/qr')

  if (import.meta.env.DEV || isDashboardRoute) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
      }
    })
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key)
        }
      })
    }
  }
}

const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

