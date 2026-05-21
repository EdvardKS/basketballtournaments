// Tournament CRUD. Admin-only mutations, public reads.
// Business rule: at most one tournament can be in a non-completed state
// at any given moment. Creating/updating a tournament into a
// non-completed status while another exists throws ONE_ACTIVE_ONLY.
import { z } from "zod";
import { query, queryOne } from "../db/query.js";
import { toTournament } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { transitionTournament } from "./lifecycle.js";

const STATUSES = ["upcoming","open","draft","setup","scheduled","active","completed"] as const;
const LIVE_STATUSES = ["upcoming","open","draft","setup","scheduled","active"] as const;
const dateRx = /^\d{4}-\d{2}-\d{2}$/;

// Server-side defaults for legacy columns we no longer expose in the
// create/edit form: maxTeams, teamSize, and gameDurationMinutes. The DB
// columns are still NOT NULL, but the admin chooses captains explicitly
// and the draft runs until every registered player is picked, so these
// values are now bookkeeping defaults only.
const LEGACY_MAX_TEAMS = 99;
const LEGACY_TEAM_SIZE = 0;
const LEGACY_GAME_DURATION_MINUTES = 20;

export const tournamentSchema = z.object({
  name: z.string().min(2).max(100),
  date: z.string().regex(dateRx).optional(),
  status: z.enum(STATUSES).default("open"),
  location: z.string().min(2).max(200),
  description: z.string().min(1).max(2000),
  rules: z.string().max(5000).optional().nullable(),
  inscriptionStart: z.string().regex(dateRx).optional().nullable(),
  inscriptionEnd: z.string().regex(dateRx).optional().nullable(),
  draftStart: z.string().regex(dateRx).optional().nullable(),
  draftEnd: z.string().regex(dateRx).optional().nullable(),
  matchDate: z.string().regex(dateRx).optional().nullable(),
  courtCount: z.coerce.number().int().min(1).max(10).default(1),
  halfCourt: z.boolean().default(true),
  bracketFormat: z.enum([
    "top2_per_group",
    "top1_plus_best2_seconds",
    "top2_single_group",
    "top4_single_group",
  ]).default("top2_per_group"),
  bracketSize: z.union([
    z.literal(2), z.literal(4), z.literal(8), z.literal(16),
  ]).optional().nullable(),
  // Generic bracket plan — takes precedence over (format, size) when both
  // are provided. qualifiersPerGroup * G + wildcards must land on a
  // supported bracket size (2, 4, 8, 16).
  bracketQualifiersPerGroup: z.coerce.number().int().min(0).max(99).optional().nullable(),
  bracketWildcards: z.coerce.number().int().min(0).max(99).optional().nullable(),
});

export const updateSchema = tournamentSchema.partial().extend({
  winnerId: z.string().optional().nullable(),
  hoursConfirmed: z.boolean().optional(),
});

const assertSingleLive = async (nextStatus: string, excludeId?: string) => {
  if (nextStatus === "completed") return;
  const rows = await query(
    `SELECT id, name FROM tournaments
     WHERE status = ANY($1::text[]) AND deleted_at IS NULL
       AND ($2::text IS NULL OR id <> $2)`,
    [LIVE_STATUSES as unknown as string[], excludeId ?? null]);
  if (rows.length > 0) {
    throw new HttpError(409, "ONE_ACTIVE_ONLY",
      `Ya existe un torneo en curso (${(rows[0] as { name: string }).name}).`);
  }
};

export const listTournaments = async () => {
  const rows = await query(
    "SELECT * FROM tournaments WHERE deleted_at IS NULL ORDER BY date DESC");
  return rows.map(toTournament);
};

export const getTournament = async (id: string) => {
  await transitionTournament(id);
  const row = await queryOne(
    "SELECT * FROM tournaments WHERE id=$1 AND deleted_at IS NULL", [id]);
  if (!row) throw new HttpError(404, "TOURNAMENT_NOT_FOUND");
  return toTournament(row);
};

// Lock the bracket configuration so the group editor + bracket picker
// cannot be edited until unlocked. Idempotent: locking a locked tournament
// is a no-op, unlocking an unlocked one likewise.
export const lockBracket = async (id: string) => {
  const row = await queryOne(
    `UPDATE tournaments SET bracket_locked_at = COALESCE(bracket_locked_at, NOW())
       WHERE id=$1 AND deleted_at IS NULL RETURNING *`, [id]);
  if (!row) throw new HttpError(404, "TOURNAMENT_NOT_FOUND");
  return toTournament(row);
};

export const unlockBracket = async (id: string) => {
  const row = await queryOne(
    `UPDATE tournaments SET bracket_locked_at = NULL
       WHERE id=$1 AND deleted_at IS NULL RETURNING *`, [id]);
  if (!row) throw new HttpError(404, "TOURNAMENT_NOT_FOUND");
  return toTournament(row);
};

// Throws if the tournament's bracket has been "fijada"; used by every
// mutation that would invalidate the locked configuration.
export const assertBracketUnlocked = async (id: string) => {
  const row = await queryOne(
    "SELECT bracket_locked_at FROM tournaments WHERE id=$1", [id]);
  if (row && (row as { bracket_locked_at: Date | string | null }).bracket_locked_at) {
    throw new HttpError(409, "BRACKET_LOCKED",
      "La configuración está fijada. Desfíjala antes de modificar grupos o eliminatorias.");
  }
};

// Soft-delete with double confirmation: caller must echo the exact
// tournament name and the literal string "DELETE". Registrations and
// players remain in the DB — only the tournament row is hidden.
export const softDeleteTournament = async (
  id: string, raw: unknown,
): Promise<{ ok: true }> => {
  const body = raw as { confirm?: unknown; name?: unknown } | null | undefined;
  const confirm = body?.confirm;
  const name = body?.name;
  if (confirm !== "DELETE" || typeof name !== "string" || name.length === 0) {
    throw new HttpError(400, "CONFIRMATION_REQUIRED",
      "Falta confirmación (confirm='DELETE' y name=<nombre del torneo>).");
  }
  const row = await queryOne(
    "SELECT name FROM tournaments WHERE id=$1 AND deleted_at IS NULL", [id]);
  if (!row) throw new HttpError(404, "TOURNAMENT_NOT_FOUND");
  if ((row as { name: string }).name !== name) {
    throw new HttpError(400, "NAME_MISMATCH",
      "El nombre introducido no coincide con el del torneo.");
  }
  await queryOne(
    "UPDATE tournaments SET deleted_at = NOW() WHERE id=$1 RETURNING id", [id]);
  return { ok: true };
};

export const createTournament = async (raw: unknown) => {
  const data = tournamentSchema.parse(raw);
  await assertSingleLive(data.status);
  const row = await queryOne(
    `INSERT INTO tournaments
       (name, date, status, location, description, rules, max_teams,
        inscription_start, inscription_end, draft_start, draft_end, match_date,
        court_count, half_court, game_duration_minutes, team_size,
        bracket_format, bracket_size,
        bracket_qualifiers_per_group, bracket_wildcards)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING *`,
    [data.name, data.matchDate ?? data.date ?? null, data.status, data.location,
     data.description, data.rules ?? null, LEGACY_MAX_TEAMS,
     data.inscriptionStart ?? null, data.inscriptionEnd ?? null,
     data.draftStart ?? null, data.draftEnd ?? null, data.matchDate ?? null,
     data.courtCount, data.halfCourt, LEGACY_GAME_DURATION_MINUTES, LEGACY_TEAM_SIZE,
     data.bracketFormat, data.bracketSize ?? null,
     data.bracketQualifiersPerGroup ?? null, data.bracketWildcards ?? null],
  );
  return toTournament(row!);
};

export const patchTournament = async (id: string, raw: unknown) => {
  const data = updateSchema.parse(raw);
  const current = await getTournament(id);
  const merged = { ...current, ...data };
  if (data.status && data.status !== current.status) {
    await assertSingleLive(merged.status, id);
  }
  const row = await queryOne(
    `UPDATE tournaments SET
       name=$2, date=COALESCE($3, date), status=$4, location=$5,
       description=$6, rules=$7, winner_id=$8,
       inscription_start=COALESCE($9, inscription_start),
       inscription_end=COALESCE($10, inscription_end),
       draft_start=COALESCE($11, draft_start),
       draft_end=COALESCE($12, draft_end),
       match_date=COALESCE($13, match_date),
       court_count=$14, half_court=$15,
       hours_confirmed=COALESCE($16, hours_confirmed),
       bracket_format=$17, bracket_size=$18,
       bracket_qualifiers_per_group=$19, bracket_wildcards=$20
     WHERE id=$1 RETURNING *`,
    [id, merged.name, merged.matchDate ?? null, merged.status, merged.location,
     merged.description, merged.rules ?? null, merged.winnerId ?? null,
     merged.inscriptionStart ?? null, merged.inscriptionEnd ?? null,
     merged.draftStart ?? null, merged.draftEnd ?? null, merged.matchDate ?? null,
     merged.courtCount, merged.halfCourt,
     (data as { hoursConfirmed?: boolean }).hoursConfirmed ?? null,
     merged.bracketFormat, merged.bracketSize ?? null,
     merged.bracketQualifiersPerGroup ?? null,
     merged.bracketWildcards ?? null],
  );
  return toTournament(row!);
};
