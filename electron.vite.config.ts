import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const sharedAlias = { '@shared': resolve(__dirname, 'src/shared') }

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    // A fixed name for the script worker chunk: the main process loads it lazily by path, and a hashed name breaks a
    // running `npm run dev` as soon as another build (e.g. `npm run test:e2e`) rewrites out/.
    build: { rollupOptions: { output: { chunkFileNames: 'chunks/[name].js' } } }
  },
  preload: { resolve: { alias: sharedAlias } },
  renderer: {
    resolve: { alias: { ...sharedAlias, '@': resolve(__dirname, 'src/renderer/src') } },
    plugins: [react(), tailwindcss()]
  }
})
