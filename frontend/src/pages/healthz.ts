// Liveness probe consumed by the docker healthcheck and any external
// monitor. Intentionally trivial: no DB / API call, no SSR data fetch,
// so the response is fast and independent of upstream state. Use /api/health
// on the backend container for deep DB readiness.
export const prerender = false;
export const GET = () => new Response("ok\n", { status: 200, headers: { "content-type": "text/plain" } });
