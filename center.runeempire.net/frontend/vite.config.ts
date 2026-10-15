import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Same origin as production, where the proxy forwards /api to Laravel:
    // the session and XSRF cookies stay on this origin and no CORS is involved.
    // Open the site as localhost:5173 (not 127.0.0.1): Sanctum only gives
    // that origin a session.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        xfwd: true,
      },
    },
  },
})
