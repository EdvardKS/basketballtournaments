// Player update and history. Admins can change any field; players only their own safe fields.
import { z } from "zod";
import { query, queryOne } from "../db/query.js";
import { toPlayer } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { computeOverall, STAT_KEYS, MAX_STAT_TOTAL } from "./players.js";
import { exportTournamentRegistrationsCsv } from "./registration-backup.js";
import type { Role } from "../types.js";

const adminPatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  mobile: z.string().min(6).max(30).optional(),
  email: z.string().email().nullable().optional(),
  avatar: z.string().max(500_000).nullable().optional(),
  age: z.coerce.number().int().min(10).max(80).nullable().optional(),
  position: z.string().min(2).max(20).optional(),
  username: z.string().min(3).max(30).nullable().optional(),
  role: z.enum(["player","captain","admin"]).optional(),
  isPublic: z.boolean().optional(),
  pace: z.coerce.number().int().min(1).max(99).optional(),
  shooting: z.coerce.number().int().min(1).max(99).optional(),
  passing: z.coerce.number().int().min(1).max(99).optional(),
  dribbling: z.coerce.number().int().min(1).max(99).optional(),
  defense: z.coerce.number().int().min(1).max(99).optional(),
  physical: z.coerce.number().int().min(1).max(99).optional(),
});

const playerPatchSchema = adminPatchSchema.pick({
  name: true, email: true, avatar: true, age: true, isPublic: true,
  position: true, mobile: true, username: true,
});

export const playerStatsSchema = z.object({
  pace:      z.coerce.number().int().min(0).max(99),
  shooting:  z.coerce.number().int().min(0).max(99),
  passing:   z.coerce.number().int().min(0).max(99),
  dribbling: z.coerce.number().int().min(0).max(99),
  defense:   z.coerce.number().int().min(0).max(99),
  physical:  z.coerce.number().int().min(0).max(99),
}).refine(
  (s) => STAT_KEYS.reduce((a, k) => a + s[k], 0) <= MAX_STAT_TOTAL,
  { message: "STATS_EXCEED_240" },
);

export const updatePlayer = async (id: string, raw: unknown, role: Role) => {
  const schema = role === "admin" ? adminPatchSchema : playerPatchSchema;
  const data = schema.parse(raw);
  const current = await queryOne("SELECT * FROM players WHERE id=$1", [id]);
  if (!current) throw new HttpError(404, "PLAYER_NOT_FOUND");

  const stats: Partial<Record<typeof STAT_KEYS[number], number>> = {};
  for (const k of STAT_KEYS) {
    stats[k] = (data as Record<string, number>)[k] ?? (current as Record<string, number>)[k];
  }
  const overall = computeOverall(stats);

  const row = await queryOne(
    `UPDATE players SET
       name=COALESCE($2, name),
       mobile=COALESCE($3, mobile),
       email=COALESCE($4, email),
       avatar=COALESCE($5, avatar),
       age=COALESCE($6, age),
       position=COALESCE($7, position),
       role=COALESCE($8, role),
       is_public=COALESCE($9, is_public),
       username=COALESCE($17, username),
       pace=$10, shooting=$11, passing=$12,
       dribbling=$13, defense=$14, physical=$15, overall=$16
     WHERE id=$1 RETURNING *`,
    [id,
     (data as { name?: string }).name ?? null,
     (data as { mobile?: string }).mobile ?? null,
     (data as { email?: string | null }).email ?? null,
     (data as { avatar?: string | null }).avatar ?? null,
     (data as { age?: number | null }).age ?? null,
     (data as { position?: string }).position ?? null,
     (data as { role?: string }).role ?? null,
     (data as { isPublic?: boolean }).isPublic ?? null,
     stats.pace, stats.shooting, stats.passing,
     stats.dribbling, stats.defense, stats.physical, overall,
     (data as { username?: string | null }).username ?? null],
  );
  // Refresh CSV for every tournament this player is registered in — their
  // name/mobile/role/stats may all surface in the backup file.
  const regs = await query<{ tournament_id: string }>(
    "SELECT tournament_id FROM tournament_registrations WHERE player_id=$1",
    [id],
  );
  for (const r of regs) {
    await exportTournamentRegistrationsCsv(r.tournament_id);
  }
  return toPlayer(row!);
};

export const playerHistory = async (id: string) => {
  const tournaments = await query(
    `SELECT t.id, t.name, t.match_date, t.status,
            tm.id AS team_id, tm.name AS team_name,
            s.overall AS snapshot_overall, s.snapshot_at
     FROM tournament_registrations r
     JOIN tournaments t ON t.id = r.tournament_id
     LEFT JOIN team_players tp ON tp.player_id = r.player_id
     LEFT JOIN teams tm ON tm.id = tp.team_id AND tm.tournament_id = t.id
     LEFT JOIN player_skill_snapshots s ON s.player_id = r.player_id AND s.tournament_id = t.id
     WHERE r.player_id = $1
     ORDER BY t.match_date DESC NULLS LAST`, [id],
  );
  return { tournaments };
};
