import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import vfsManifest from './vite-plugin-vfs-manifest.ts'

export default defineConfig({
  plugins: [
    react(),
    vfsManifest({
      pattern: 'posts/**/*.md',
      sidecarPattern: ['posts/**/.*.meta.yaml', 'demos/.*.meta.yaml'],
    }),
  ],
  server: {
    port: 3000,
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['tests/**'],
  },
})
