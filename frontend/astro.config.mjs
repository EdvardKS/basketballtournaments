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
  // Astro 5 enables a CSRF check by default that rejects any non-GET request
  // whose Origin header doesn't match the Host header — with the exact 403
  // message "Cross-site POST form submissions are forbidden". Behind a
  // reverse proxy that doesn't forward Host (or that uses an internal
  // hostname like basket_frontend_prod:4321), Origin=https://example.com
  // never matches Host=basket_frontend_prod:4321 and every POST is killed
  // before our /api/* proxy middleware even runs. We're already protected by
  // SameSite=Lax cookies + backend session auth, so disable the check.
  security: { checkOrigin: false },
  vite: {
    plugins: [tailwind()],
    server: {
      watch: { usePolling: true, interval: 300 },
      // Dev-only: lock Vite's static file serving to /app/src and friends
      // so a path-traversal URL like /foto/../package.json cannot reach
      // sensitive files that live at the workspace root.
      fs: {
        strict: true,
        allow: [".", "./src", "./public"],
        deny: [
          "**/.env*",
          "**/package.json",
          "**/package-lock.json",
          "**/pnpm-lock.yaml",
          "**/tsconfig*.json",
          "**/astro.config.*",
        ],
      },
    },
  },
});
