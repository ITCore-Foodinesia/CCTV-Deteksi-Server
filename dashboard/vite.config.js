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
    ],
    proxy: {
      // Proxy API requests to Flask Backend (Port 5001)
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket requests to Flask Backend (Port 5001)
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // Proxy Video Feed to Internal Server (Port 5002) - or 5001 if using ZMQ mode
      '/video_feed': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
