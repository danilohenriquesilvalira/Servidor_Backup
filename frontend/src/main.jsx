import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

async function init() {
  // Em Tauri nativo, substitui o fetch do browser pelo fetch nativo do plugin.
  // Isso bypassa o bloqueio de mixed-content (https://tauri.localhost -> http://servidor).
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')
      window.fetch = tauriFetch
    } catch (e) {
      console.warn('Tauri HTTP plugin nao disponivel:', e)
    }
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

init()
