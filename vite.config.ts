import { cloudflare } from "@cloudflare/vite-plugin";
import { resolve } from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  root: ".",
  build: {
    target: "esnext",
    outDir: "dist",
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks: {
          noir: ["@noir-lang/noir_js"],
          bb: ["@aztec/bb.js"],
          noirc_abi: ["@noir-lang/noirc_abi"],
          acvm_js: ["@noir-lang/acvm_js"],
        },
      },
    },
    minify: "terser",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
    exclude: ["@noir-lang/noirc_abi", "@noir-lang/acvm_js"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
    cloudflare(),
  ],
  server: {
    port: 5173,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
