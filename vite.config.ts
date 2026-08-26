import path from 'node:path'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

// The About panel used to hardcode the version string, so it kept claiming
// 1.0.0 after an update. Injected at build time rather than fetched over IPC:
// the renderer bundle is rebuilt for every release, so it cannot drift.
const { version } = createRequire(import.meta.url)('./package.json') as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
      },
      preload: {
        // Preload scripts may contain Web assets, so use
        // `build.rollupOptions.input` instead of `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: 'cjs', // Force CJS output for better compat with electron main
                entryFileNames: '[name].cjs',
              },
            },
          },
        },
      },
      // Polyfill the Electron and Node.js API for the renderer process.
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
})
