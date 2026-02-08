import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import stylex from '@stylexjs/unplugin'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    stylex.vite({}),
    react(),
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files larger than 1KB
      deleteOriginFile: false,
    }),
    // Brotli compression
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ],
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
      mangle: {
        safari10: true,
      },
    },
    // Manual chunking for better code splitting
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('react-router')) {
              return 'vendor-router'
            }
            if (id.includes('xterm')) {
              return 'vendor-xterm'
            }
            // Other vendor code
            return 'vendor'
          }
          // Split commands into separate chunk
          if (id.includes('/commands/')) {
            return 'commands'
          }
          // Split utils into separate chunk
          if (id.includes('/utils/')) {
            return 'utils'
          }
        },
        // Smaller chunk size target
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
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
    // Target modern browsers for smaller output
    target: 'es2015',
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
