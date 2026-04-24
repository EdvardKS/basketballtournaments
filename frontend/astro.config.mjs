import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@tailwindcss/vite";
import node from "@astrojs/node";

// /api/* is proxied by src/middleware.ts, which runs in both dev and
// production, so no Vite proxy is needed.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  server: { host: "0.0.0.0", port: 4321 },
  vite: {
    plugins: [tailwind()],
    server: {
      watch: { usePolling: true, interval: 300 },
    },
  },
});
