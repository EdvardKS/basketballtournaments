// Player CRUD business logic. Overall stat is recomputed server-side
// so the client cannot forge it.
import { z } from "zod";
import { query, queryOne } from "../db/query.js";
import { toPlayer } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";

export const STAT_KEYS = ["pace","shooting","passing","dribbling","defense","physical"] as const;
type StatKey = typeof STAT_KEYS[number];
type WithStats = Partial<Record<StatKey, number>>;

export const computeOverall = (s: WithStats): number => {
  const sum = STAT_KEYS.reduce((a, k) => a + (s[k] ?? 50), 0);
  return Math.round(sum / STAT_KEYS.length);
};

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  mobile: z.string().min(6).max(30),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6).max(100),
  age: z.coerce.number().int().min(10).max(80).optional().nullable(),
  avatar: z.string().max(600_000).optional().nullable(),
  gdprAccepted: z.boolean().refine((v) => v === true, { message: "GDPR_REQUIRED" }),
  position: z.string().min(2).max(20).default("base"),
  isPublic: z.boolean().default(true),
});

export const createPlayer = async (raw: unknown) => {
  const data = registerSchema.parse(raw);
  const existing = await queryOne("SELECT id FROM players WHERE mobile=$1", [data.mobile]);
  if (existing) throw new HttpError(409, "MOBILE_TAKEN");
  const overall = computeOverall({});
  const row = await queryOne(
    `INSERT INTO players
      (name, mobile, email, role, position, password, is_public, avatar,
       age, gdpr_accepted, gdpr_accepted_at,
       pace, shooting, passing, dribbling, defense, physical, overall)
     VALUES ($1,$2,$3,'player',$4,$5,$6,$7,$8,$9,NOW(),50,50,50,50,50,50,$10)
     RETURNING *`,
    [data.name, data.mobile, data.email ?? null,
     data.position, data.password, data.isPublic, data.avatar ?? null,
     data.age ?? null, data.gdprAccepted, overall],
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
