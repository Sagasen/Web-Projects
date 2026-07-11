// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5200, // port khusus Tarasari supaya tidak bentrok dengan project lain
  },
})
