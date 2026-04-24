import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@tailwindcss/vite";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  server: { host: "0.0.0.0", port: 4321 },
  vite: {
    plugins: [tailwind()],
    server: {
      watch: { usePolling: true, interval: 300 },
      proxy: {
        "/api": {
          target: process.env.PUBLIC_API_BASE || "http://backend:4000",
          changeOrigin: true,
        },
      },
    },
  },
});
