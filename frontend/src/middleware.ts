// Astro middleware: proxies /api/* to the backend container.
// Runs in both `astro dev` and the production Node server, so the browser
// always uses same-origin /api URLs and cookies flow naturally (no CORS).
import { defineMiddleware } from "astro:middleware";

const BACKEND = import.meta.env.PUBLIC_API_BASE ?? "http://backend:4000";

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "transfer-encoding", "upgrade",
  "proxy-authenticate", "proxy-authorization", "te", "trailer",
]);

export const onRequest = defineMiddleware(async ({ request }, next) => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return next();

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(BACKEND + url.pathname + url.search, init);
  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.append(key, value);
  });
  return new Response(upstream.body, { status: upstream.status, headers: out });
});
