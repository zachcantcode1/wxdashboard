import path from "path" // Import the path module
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Use Railway URL in production, localhost in development
  const backendUrl = mode === 'production' 
    ? 'https://wxdashboard-production.up.railway.app'
    : 'http://localhost:3001';

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"), // Define the @/* alias
      },
    },
    define: {
      // Make backend URL available to the frontend
      __BACKEND_URL__: JSON.stringify(backendUrl),
    },
    server: {
      host: '0.0.0.0', // Allow external connections
      port: 5173,      // Specify port (optional)
      fs: {
        strict: false,
      },
      proxy: {
        '/api': backendUrl,
        '/processed': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
