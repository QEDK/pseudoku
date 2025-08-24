import { defineConfig } from 'vite';
import { resolve } from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  root: '.',
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          'noir': ['@noir-lang/noir_js'],
          'bb': ['@aztec/bb.js']
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext"
    },
    exclude: ['@noir-lang/noirc_abi', '@noir-lang/acvm_js']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
});
