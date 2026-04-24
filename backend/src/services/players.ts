// Player CRUD business logic. Overall stat is recomputed server-side
// so the client cannot forge it.
import { z } from "zod";
import { query, queryOne } from "../db/query.js";
import { toPlayer } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";

export const STAT_KEYS = ["pace","shooting","passing","dribbling","defense","physical"] as const;

export const computeOverall = (s: Record<string, number>) => {
  const sum = STAT_KEYS.reduce((a, k) => a + (s[k] ?? 50), 0);
  return Math.round(sum / STAT_KEYS.length);
};

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  mobile: z.string().min(6).max(30),
  username: z.string().min(3).max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6).max(100),
  position: z.string().min(2).max(20).default("base"),
  pace: z.coerce.number().int().min(1).max(99).default(50),
  shooting: z.coerce.number().int().min(1).max(99).default(50),
  passing: z.coerce.number().int().min(1).max(99).default(50),
  dribbling: z.coerce.number().int().min(1).max(99).default(50),
  defense: z.coerce.number().int().min(1).max(99).default(50),
  physical: z.coerce.number().int().min(1).max(99).default(50),
  isPublic: z.boolean().default(true),
});

export const createPlayer = async (raw: unknown) => {
  const data = registerSchema.parse(raw);
  const existing = await queryOne("SELECT id FROM players WHERE mobile=$1", [data.mobile]);
  if (existing) throw new HttpError(409, "MOBILE_TAKEN");
  const overall = computeOverall(data);
  const row = await queryOne(
    `INSERT INTO players
      (name, mobile, username, email, role, position, password, is_public,
       pace, shooting, passing, dribbling, defense, physical, overall)
     VALUES ($1,$2,$3,$4,'player',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [data.name, data.mobile, data.username ?? null, data.email ?? null,
     data.position, data.password, data.isPublic,
     data.pace, data.shooting, data.passing, data.dribbling,
     data.defense, data.physical, overall],
  );
  return toPlayer(row!);
};

export const listPlayers = async () => {
  const rows = await query("SELECT * FROM players ORDER BY name");
  return rows.map(toPlayer);
};

export const getPlayer = async (id: string) => {
  const row = await queryOne("SELECT * FROM players WHERE id=$1", [id]);
  if (!row) throw new HttpError(404, "PLAYER_NOT_FOUND");
  return toPlayer(row);
};
