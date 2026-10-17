import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(() => {
  // Support Cloudflare Pages / Workers (root /), custom base path, or default to GitHub Pages (/git-diff-web/)
  const isCloudflare = Boolean(
    process.env.CF_PAGES ||
    process.env.CLOUDFLARE_BUILD ||
    process.env.DEPLOY_TARGET === 'cloudflare'
  )

  const base = isCloudflare ? '/' : (process.env.VITE_BASE_PATH || '/git-diff-web/')

  return {
    plugins: [react()],
    base,
  }
})
