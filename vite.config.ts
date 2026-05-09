import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/plaid': 'http://localhost:3000',
      '/proxy': 'http://localhost:3000',
      '/ai':    'http://localhost:3000',
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react:    ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          charts:   ['recharts'],
          plaid:    ['react-plaid-link'],
        },
      },
    },
  },
});