import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Prioritize API_KEY from the loaded environment (which merges process.env)
  // Fallback to empty string to avoid "undefined" in the build output
  const apiKey = env.API_KEY || process.env.API_KEY || env.VITE_API_KEY || '';

  if (!apiKey) {
      console.warn("⚠️  WARNING: API_KEY is not defined in environment variables or .env file.");
  } else {
      console.log("✅ API_KEY found and injected.");
  }

  return {
    plugins: [react()],
    define: {
      // Explicitly inject the API_KEY so it's available in the browser via process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(apiKey),
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