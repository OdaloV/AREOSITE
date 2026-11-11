import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cesium({
      rebuildCesium: false
    })
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'clsx'],
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/tiles': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/layers': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
});
