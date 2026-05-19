// Player profile/stats updates. Admin can change any player,
// users can only update their own profile (no stat edits).
import { z } from "zod";
import { query, queryOne } from "../db/query.js";
import { toPlayer } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { computeOverall, STAT_KEYS } from "./players.js";
import type { Player } from "../types.js";

export const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional().nullable(),
  avatar: z.string().max(500_000).optional().nullable(),
  isPublic: z.boolean().optional(),
  position: z.string().min(2).max(20).optional(),
});

export const statsSchema = z.object({
  pace: z.coerce.number().int().min(1).max(99).optional(),
  shooting: z.coerce.number().int().min(1).max(99).optional(),
  passing: z.coerce.number().int().min(1).max(99).optional(),
  dribbling: z.coerce.number().int().min(1).max(99).optional(),
  defense: z.coerce.number().int().min(1).max(99).optional(),
  physical: z.coerce.number().int().min(1).max(99).optional(),
});

export const updatePlayer = async (
  id: string, raw: unknown, requestingRole: Player["role"],
) => {
  const current = await queryOne("SELECT * FROM players WHERE id=$1", [id]);
  if (!current) throw new HttpError(404, "PLAYER_NOT_FOUND");
  const profile = profileSchema.parse(raw);
  const stats = requestingRole === "admin" ? statsSchema.parse(raw) : {};

  const next = { ...current, ...profile, ...stats } as Record<string, unknown>;
  const overall = computeOverall({
    pace: Number(next.pace), shooting: Number(next.shooting),
    passing: Number(next.passing), dribbling: Number(next.dribbling),
    defense: Number(next.defense), physical: Number(next.physical),
  });

  const row = await queryOne(
    `UPDATE players SET name=$2, email=$3, avatar=$4, is_public=$5, position=$6,
       pace=$7, shooting=$8, passing=$9, dribbling=$10, defense=$11, physical=$12, overall=$13
     WHERE id=$1 RETURNING *`,
    [id, next.name, next.email ?? null, next.avatar ?? null,
     Boolean(next.is_public), next.position,
     ...STAT_KEYS.map((k) => Number((next as Record<string, unknown>)[k])),
     overall],
  );
  return toPlayer(row!);
};

export const playerHistory = async (id: string) => {
  return query(
    `SELECT s.*, t.name AS tournament_name, t.date AS tournament_date
     FROM player_skill_snapshots s
     JOIN tournaments t ON t.id = s.tournament_id
     WHERE s.player_id=$1
     ORDER BY t.date DESC`, [id],
  );
};
