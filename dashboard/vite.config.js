import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all interfaces (0.0.0.0) - required for Cloudflare tunnel
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'dashboard.foodiserver.my.id',
      'dashboards.foodiserver.my.id',
      '.ngrok-free.app',
      'localhost',
      '.ngrok.io'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        // Handle connection errors gracefully
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Proxy] API error:', err.message);
          });
        }
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
        secure: false,
        // Handle WebSocket errors gracefully
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Proxy] WebSocket error:', err.message);
          });
        }
      },
      '/video_feed': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      }
    },
    // Disable HMR WebSocket when accessed via tunnel (falls back to polling)
    hmr: {
      clientPort: 5173,
      // Use polling for HMR when accessed via Cloudflare tunnel
    }
  },
  // Preview server (for production builds)
  preview: {
    host: true,
    port: 4173,
  }
})
