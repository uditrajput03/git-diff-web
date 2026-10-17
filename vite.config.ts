import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    // Relative base ensures asset URLs (./assets/...) resolve properly on:
    // 1. Cloudflare Pages / Workers (root /)
    // 2. Custom domains
    // 3. GitHub Pages (/git-diff-web/)
    base: './',
  }
})
