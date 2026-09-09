import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  base: '/dungeon-keeper/',
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  server: { host: '127.0.0.1' },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) =>
          id.includes('/three/')
            ? 'three'
            : id.includes('/@base-ui/')
              ? 'ui'
              : id.includes('/react/') || id.includes('/react-dom/')
                ? 'react'
                : undefined,
      },
    },
  },
});
