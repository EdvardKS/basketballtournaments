// Dual-mode API client: server-side uses direct backend URL, client-side uses /api proxy.
const SSR_BASE = (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_API_BASE)
  ? import.meta.env.PUBLIC_API_BASE
  : "http://backend:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public body?: unknown,
  ) { super(code); }
}

export const api = async <T = unknown>(
  path: string,
  init: RequestInit = {},
  cookie?: string,
): Promise<T> => {
  const isServer = typeof window === "undefined";
  const url = isServer ? `${SSR_BASE}/api${path}` : `/api${path}`;

  const headers = new Headers(init.headers);
  if (isServer && cookie) headers.set("cookie", cookie);
  if (!(init.body instanceof FormData) && init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: isServer ? "omit" : "include",
  });

  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!response.ok) {
    const body = data as { code?: string; error?: string };
    const code = body?.code ?? body?.error ?? "UNKNOWN_ERROR";
    throw new ApiError(response.status, code, data);
  }
  return data as T;
};

export const getCookieHeader = (request: Request): string =>
  request.headers.get("cookie") ?? "";
