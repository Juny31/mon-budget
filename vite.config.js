import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Base path pour GitHub Pages : https://juny31.github.io/mon-budget
  base: '/mon-budget/',
  server: {
    host: true,   // expose sur le réseau local (0.0.0.0)
    port: 5173,
  },
})
