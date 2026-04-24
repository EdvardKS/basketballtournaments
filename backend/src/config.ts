// Environment configuration — validated once at boot.
// Any missing required value kills the process with a clear message.

const required = (key: string): string => {
  const v = process.env[key];
  if (!v || v.trim() === "") {
    console.error(`[config] Missing env var: ${key}`);
    process.exit(1);
  }
  return v;
};

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-in-prod",
  cookieName: process.env.COOKIE_NAME ?? "basket_sid",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:4322",
  // Explicit so prod-on-plain-HTTP (e.g. localhost) still works.
  // Set COOKIE_SECURE=true only when serving over HTTPS.
  cookieSecure: process.env.COOKIE_SECURE === "true",
  isDev: (process.env.NODE_ENV ?? "development") !== "production",
};

export type AppConfig = typeof config;
