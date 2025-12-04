// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // טוען את כל משתני הסביבה (כולל VITE_*) מקובצי ה-.env
  const env = loadEnv(mode, (process as any).cwd(), '');

  // מחפש את VITE_API_KEY שהוגדר ב-.env או במשתני הסביבה של המערכת
  // אם לא נמצא, משתמש במחרוזת ריקה ('' )כדי למנוע שגיאות.
  const apiKey = env.VITE_API_KEY || '';

  if (!apiKey) {
      console.warn("⚠️ WARNING: VITE_API_KEY is not defined in the .env file. API calls may fail.");
  } else {
      console.log("✅ VITE_API_KEY found and injected.");
  }

  return {
    plugins: [react()],
    define: {
      // מזריק את המפתח לתוך האפליקציה ב-Front-end
      // שים לב: זה מוזרק לשם VITE_API_KEY כחלק מ process.env
      'process.env.VITE_API_KEY': JSON.stringify(apiKey),
    },
    // שאר הגדרות הבנייה (build) והשרת (server) נשארות כפי שהן...
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
    },
  };
});