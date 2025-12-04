import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Explicitly inject the API_KEY so it's available in the browser via process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Fallback for other process.env usage to prevent crashes, but keys must be explicit
      'process.env': {} 
    },
    build: {
      rollupOptions: {
        external: ['intro.js', 'react', 'react-dom', 'recharts'],
      }
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
    },
    preview: {
      host: true,
      port: 5173,
      allowedHosts: true,
    },
  };
});