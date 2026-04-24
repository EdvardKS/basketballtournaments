// Tournament CRUD. Admin-only mutations, public reads.
// Business rule: at most one tournament can be in a non-completed state
// at any given moment. Creating/updating a tournament into a
// non-completed status while another exists throws ONE_ACTIVE_ONLY.
import { z } from "zod";
import { query, queryOne } from "../db/query.js";
import { toTournament } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";

const STATUSES = ["upcoming","open","draft","setup","scheduled","active","completed"] as const;
const LIVE_STATUSES = ["upcoming","open","draft","setup","scheduled","active"] as const;
const dateRx = /^\d{4}-\d{2}-\d{2}$/;

export const tournamentSchema = z.object({
  name: z.string().min(2).max(100),
  date: z.string().regex(dateRx).optional(),
  status: z.enum(STATUSES).default("open"),
  location: z.string().min(2).max(200),
  description: z.string().min(1).max(2000),
  rules: z.string().max(5000).optional().nullable(),
  maxTeams: z.coerce.number().int().min(2).max(32).default(8),
  inscriptionStart: z.string().regex(dateRx).optional().nullable(),
  inscriptionEnd: z.string().regex(dateRx).optional().nullable(),
  draftStart: z.string().regex(dateRx).optional().nullable(),
  draftEnd: z.string().regex(dateRx).optional().nullable(),
  matchDate: z.string().regex(dateRx).optional().nullable(),
  courtCount: z.coerce.number().int().min(1).max(10).default(1),
  halfCourt: z.boolean().default(true),
  gameDurationMinutes: z.coerce.number().int().min(5).max(60).default(20),
  teamSize: z.coerce.number().int().min(2).max(7).default(3),
});

export const updateSchema = tournamentSchema.partial().extend({
  winnerId: z.string().optional().nullable(),
  hoursConfirmed: z.boolean().optional(),
});

const assertSingleLive = async (nextStatus: string, excludeId?: string) => {
  if (nextStatus === "completed") return;
  const rows = await query(
    `SELECT id, name FROM tournaments
     WHERE status = ANY($1::text[]) AND ($2::text IS NULL OR id <> $2)`,
    [LIVE_STATUSES as unknown as string[], excludeId ?? null]);
  if (rows.length > 0) {
    throw new HttpError(409, "ONE_ACTIVE_ONLY",
      `Ya existe un torneo en curso (${(rows[0] as { name: string }).name}).`);
  }
};

export const listTournaments = async () => {
  const rows = await query("SELECT * FROM tournaments ORDER BY date DESC");
  return rows.map(toTournament);
};

export const getTournament = async (id: string) => {
  const row = await queryOne("SELECT * FROM tournaments WHERE id=$1", [id]);
  if (!row) throw new HttpError(404, "TOURNAMENT_NOT_FOUND");
  return toTournament(row);
};

export const createTournament = async (raw: unknown) => {
  const data = tournamentSchema.parse(raw);
  await assertSingleLive(data.status);
  const row = await queryOne(
    `INSERT INTO tournaments
       (name, date, status, location, description, rules, max_teams,
        inscription_start, inscription_end, draft_start, draft_end, match_date,
        court_count, half_court, game_duration_minutes, team_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [data.name, data.matchDate ?? data.date ?? null, data.status, data.location,
     data.description, data.rules ?? null, data.maxTeams,
     data.inscriptionStart ?? null, data.inscriptionEnd ?? null,
     data.draftStart ?? null, data.draftEnd ?? null, data.matchDate ?? null,
     data.courtCount, data.halfCourt, data.gameDurationMinutes, data.teamSize],
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
       description=$6, rules=$7, max_teams=$8, winner_id=$9,
       inscription_start=COALESCE($10, inscription_start),
       inscription_end=COALESCE($11, inscription_end),
       draft_start=COALESCE($12, draft_start),
       draft_end=COALESCE($13, draft_end),
       match_date=COALESCE($14, match_date),
       court_count=$15, half_court=$16, game_duration_minutes=$17,
       hours_confirmed=COALESCE($18, hours_confirmed),
       team_size=$19
     WHERE id=$1 RETURNING *`,
    [id, merged.name, merged.matchDate ?? null, merged.status, merged.location,
     merged.description, merged.rules ?? null, merged.maxTeams, merged.winnerId ?? null,
     merged.inscriptionStart ?? null, merged.inscriptionEnd ?? null,
     merged.draftStart ?? null, merged.draftEnd ?? null, merged.matchDate ?? null,
     merged.courtCount, merged.halfCourt, merged.gameDurationMinutes,
     (data as { hoursConfirmed?: boolean }).hoursConfirmed ?? null,
     merged.teamSize],
  );
  return toTournament(row!);
};
