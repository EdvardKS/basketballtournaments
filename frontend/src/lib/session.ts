// Session helpers for Astro SSR: load current user, enforce auth, role checks.
import { api, ApiError, getCookieHeader } from "./api.js";
import type { Player } from "./types.js";

export interface SessionInfo {
  player: Player | null;
  isAdmin: boolean;
  isCaptain: boolean;
  isAuthenticated: boolean;
}

export const loadSession = async (request: Request): Promise<SessionInfo> => {
  try {
    const cookie = getCookieHeader(request);
    const { player } = await api<{ player: Player }>("/auth/me", {}, cookie);
    return {
      player,
      isAdmin: player.role === "admin",
      isCaptain: player.role === "captain",
      isAuthenticated: true,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return { player: null, isAdmin: false, isCaptain: false, isAuthenticated: false };
    }
    throw e;
  }
};

export const requireAuth = async (request: Request) => {
  const session = await loadSession(request);
  if (!session.isAuthenticated) {
    return { redirect: "/login", session };
  }
  return { redirect: null, session };
};

export const requireRole = async (request: Request, role: "admin" | "captain" | "player") => {
  const { redirect, session } = await requireAuth(request);
  if (redirect) return { redirect, session };
  if (session.player?.role !== role) {
    return { redirect: "/dashboard/" + (session.player?.role ?? "player"), session };
  }
  return { redirect: null, session };
};
