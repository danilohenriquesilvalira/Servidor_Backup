import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isTauriBuild = process.env.TAURI_ENV_TARGET_TRIPLE !== undefined

export default defineConfig({
  plugins: [react()],

  // Tauri requer porta fixa e strictPort para evitar conflitos
  server: {
    port: 3000,
    strictPort: true,
    host: isTauriBuild ? false : '0.0.0.0',
    proxy: !isTauriBuild ? {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://backend:3001',
        changeOrigin: true,
      }
    } : undefined
  },

  // Evita limpar o console durante o dev (Tauri loga informação útil lá)
  clearScreen: false,

  // Em build nativo, assets usam caminhos relativos
  base: isTauriBuild ? './' : '/',
})
