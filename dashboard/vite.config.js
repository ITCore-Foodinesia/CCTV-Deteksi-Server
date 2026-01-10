import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'dashboard.foodiserver.my.id',
      'dashboards.foodiserver.my.id',
      '.ngrok-free.app',
      'localhost',
      '.ngrok.io'
    ]
  }
})
