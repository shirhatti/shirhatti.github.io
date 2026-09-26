import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import vfsManifest from './vite-plugin-vfs-manifest'

export default defineConfig({
  plugins: [react(), vfsManifest({ pattern: 'posts/**/*.md' })],
  base: '/',
  server: {
    port: 3000,
  },
  build: {
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2, // Multiple passes for better compression
      },
    },
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Source maps for production (can be disabled for smaller builds)
    sourcemap: false,
    // Report compressed size
    reportCompressedSize: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@xterm/xterm',
      '@xterm/addon-fit',
      '@xterm/addon-image',
    ],
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['tests/**'],
  },
})
