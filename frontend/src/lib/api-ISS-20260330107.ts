// Unified API helper. Used from Astro server-side (via PUBLIC_API_BASE)
// and from React islands (via relative /api proxy).
const SERVER_BASE = import.meta.env.PUBLIC_API_BASE ?? "http://backend:4000";

const isServer = typeof window === "undefined";

const base = () => (isServer ? SERVER_BASE : "");

export class ApiError extends Error {
  constructor(public status: number, public code: string, public body?: unknown) {
    super(code);
  }
}

export const api = async <T = unknown>(
  path: string, init: RequestInit = {}, cookie?: string,
): Promise<T> => {
  const headers: Record<string, string> = {
    accept: "application/json",
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };
  if (init.body && !(init.body instanceof FormData)) {
    headers["content-type"] = "application/json";
  }
  if (isServer && cookie) headers.cookie = cookie;

  const res = await fetch(`${base()}/api${path}`, {
    ...init,
    headers,
    credentials: isServer ? "omit" : "include",
  });
  const text = await res.text();
  const body = text ? safeParse(text) : null;
  if (!res.ok) {
    const code = (body as { error?: string })?.error ?? `HTTP_${res.status}`;
    throw new ApiError(res.status, code, body);
  }
  return body as T;
};

const safeParse = (s: string) => {
  try { return JSON.parse(s); } catch { return s; }
};

export const getCookieHeader = (astroRequest: Request): string => {
  return astroRequest.headers.get("cookie") ?? "";
};
