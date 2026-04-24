// Helper for Astro pages: resolve the current user server-side by forwarding
// the browser cookie to the backend /api/auth/me endpoint.
import { api, getCookieHeader, ApiError } from "./api.js";
import type { Player } from "./types.js";

export interface SessionInfo {
  player: Player | null;
  isAdmin: boolean;
  isCaptain: boolean;
}

export const loadSession = async (request: Request): Promise<SessionInfo> => {
  const cookie = getCookieHeader(request);
  if (!cookie) return empty();
  try {
    const { player } = await api<{ player: Player }>("/auth/me", {}, cookie);
    return {
      player,
      isAdmin: player.role === "admin",
      isCaptain: player.role === "captain",
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return empty();
    throw err;
  }
};

const empty = (): SessionInfo => ({
  player: null, isAdmin: false, isCaptain: false,
});

export const requireAuth = async (request: Request) => {
  const session = await loadSession(request);
  if (!session.player) {
    return { session, redirect: "/login" as const };
  }
  return { session, redirect: null };
};
