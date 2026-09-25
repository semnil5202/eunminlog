import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwind()],
  define: { 'process.env': {} },
  resolve: {
    alias: [
      {
        find: '@/features/media/lib/upload-image',
        replacement: fileURLToPath(new URL('./upload-mock.ts', import.meta.url)),
      },
      { find: '@', replacement: fileURLToPath(new URL('../../src', import.meta.url)) },
    ],
  },
  server: { host: '127.0.0.1', port: 4399, strictPort: true },
});
