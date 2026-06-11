import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://story-spinner-api.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
