// Session-based auth guards. The login route sets `req.session.playerId`;
// everything else reads the session to authorize.
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "./error.js";
import { queryOne } from "../db/query.js";
import { toPlayer } from "../db/mappers.js";
import type { Player, Role } from "../types.js";

export const requireAuth = (
  req: Request, _res: Response, next: NextFunction,
) => {
  if (!req.session?.playerId) throw new HttpError(401, "UNAUTHENTICATED");
  next();
};

export const requireRole = (...allowed: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const role = req.session?.role;
    const cookiePresent = Boolean(req.headers.cookie);
    if (!role) {
      console.warn(`[auth] 401 ${req.method} ${req.originalUrl} — no session role (cookie=${cookiePresent}, sid=${req.session?.id ?? "none"}, playerId=${req.session?.playerId ?? "none"})`);
      throw new HttpError(401, "UNAUTHENTICATED",
        cookiePresent ? "Cookie llegó pero la sesión no tiene rol — vuelve a iniciar sesión." : "No llega la cookie de sesión.");
    }
    if (!allowed.includes(role)) {
      console.warn(`[auth] 403 ${req.method} ${req.originalUrl} — role=${role} not in [${allowed.join(",")}] (playerId=${req.session?.playerId})`);
      // The message reaches the admin via the JSON error body so they can see
      // exactly which role the server thinks they have, without reading logs.
      throw new HttpError(403, "FORBIDDEN",
        `Tu sesión es de tipo "${role}" pero esta acción exige rol ${allowed.join(" o ")}.`);
    }
    next();
  };

export const currentPlayer = async (req: Request): Promise<Player> => {
  const id = req.session?.playerId;
  if (!id) throw new HttpError(401, "UNAUTHENTICATED");
  const row = await queryOne("SELECT * FROM players WHERE id=$1", [id]);
  if (!row) throw new HttpError(401, "UNAUTHENTICATED");
  return toPlayer(row);
};
