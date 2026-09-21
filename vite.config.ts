import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Where the Spring backend runs. The browser only ever talks to the Vite origin in dev,
  // so no CORS configuration is needed on the backend.
  const backend = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: backend },
        // TrueLayer OAuth chain. `changeOrigin` stays false on purpose: the backend builds its relative
        // redirects (/auth/success, /auth/error) from the Host header, so the browser lands back on this
        // origin, where the SPA owns /auth/success and /auth/error. Requires the TrueLayer redirect URI
        // to be registered as <app-origin>/callback (see README).
        '/callback': { target: backend, changeOrigin: false },
        '/auth/connect-bank': { target: backend, changeOrigin: false },
      },
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      alias: { '@': path.resolve(__dirname, 'src') },
    },
  };
});
