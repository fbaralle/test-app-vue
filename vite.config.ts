import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// User's custom Vite configuration
export default defineConfig({
  plugins: [vue()],
  build: {
    sourcemap: true,
    minify: 'esbuild',
  },
  server: {
    port: 3000,
  },
});
