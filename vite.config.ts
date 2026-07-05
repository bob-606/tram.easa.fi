import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/llm': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_KEY || ''}`,
        },
        rewrite: () => '/api/v1/chat/completions',
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'web-llm': ['@mlc-ai/web-llm'],
        },
      },
    },
  },
});
