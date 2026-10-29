import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// The Netlify Supabase integration sets SUPABASE_* variables, but Vite only
// exposes VITE_* ones to the browser. Fall back to the integration's public
// values (URL + anon key only) so the client doesn't crash on a blank page.
// Never expose SUPABASE_SERVICE_ROLE_KEY or SUPABASE_JWT_SECRET here.
function supabaseUrlFromDatabaseUrl(databaseUrl) {
  try {
    const host = new URL(databaseUrl).hostname.replace(/^db\./, "");
    return host.endsWith(".supabase.co") ? `https://${host}` : "";
  } catch {
    return "";
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    supabaseUrlFromDatabaseUrl(env.SUPABASE_DATABASE_URL || "");
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  // Set on process.env so Vite's own import.meta.env handling picks them up
  // (this also works with the optional-chaining access used in src/lib).
  if (supabaseUrl) process.env.VITE_SUPABASE_URL = supabaseUrl;
  if (supabaseAnonKey) process.env.VITE_SUPABASE_ANON_KEY = supabaseAnonKey;

  return {
    // This changes the out put dir from dist to build
    // comment this out if that isn't relevant for your project
    build: {
      outDir: "build",
      chunkSizeWarningLimit: 2000,
    },
    plugins: [tsconfigPaths(), react()],
    server: {
      port: "4028",
      host: "0.0.0.0",
      strictPort: true,
      allowedHosts: ['.amazonaws.com', '.builtwithrocket.new']
    }
  };
});
