import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fallback values for deployed builds where .env is gitignored.
  // These are public/publishable keys — safe to include in client bundles.
  const fallbackEnv: Record<string, string> = {};
  if (!process.env.VITE_SUPABASE_URL) {
    fallbackEnv['import.meta.env.VITE_SUPABASE_URL'] = JSON.stringify('https://hrmmurxlyguzthdbsaec.supabase.co');
  }
  if (!process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    fallbackEnv['import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY'] = JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhybW11cnhseWd1enRoZGJzYWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODYyMDgsImV4cCI6MjA4NDA2MjIwOH0.5RMFdYrvDr_V-xy-NmdDa6wzlpgTkZ9xrEjBaLloU5g');
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    define: fallbackEnv,
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
