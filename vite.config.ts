import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tauri dev server always binds to the port in tauri.conf.json devUrl.
// TAURI_ENV_DEV_HOST is set when running on mobile/remote hosts.
const host = process.env.TAURI_ENV_DEV_HOST

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Vite options tuned for Tauri dev + build
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 5183,
        }
      : undefined,
    watch: {
      // Ignore Tauri src dir to avoid rebuild loops
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    // Produce ES2021 for Chromium-based webviews
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
