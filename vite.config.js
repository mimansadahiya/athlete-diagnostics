import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves from a subpath; Vercel/local serve from root.
  base: process.env.GITHUB_PAGES ? '/Athlete-Diagnostics/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
  },
})
