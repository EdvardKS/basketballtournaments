// Tournament CRUD. Admin-only mutations, public reads.
import { z } from "zod";
import { query, queryOne } from "../db/query.js";
import { toTournament } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";

const STATUSES = ["open","draft","setup","scheduled","active","completed"] as const;

export const tournamentSchema = z.object({
  name: z.string().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(STATUSES).default("open"),
  location: z.string().min(2).max(200),
  description: z.string().min(1).max(2000),
  rules: z.string().max(2000).optional().nullable(),
  maxTeams: z.coerce.number().int().min(2).max(32).default(8),
});

export const updateSchema = tournamentSchema.partial().extend({
  winnerId: z.string().optional().nullable(),
});

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
  const row = await queryOne(
    `INSERT INTO tournaments (name, date, status, location, description, rules, max_teams)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.name, data.date, data.status, data.location,
     data.description, data.rules ?? null, data.maxTeams],
  );
  return toTournament(row!);
};

export const patchTournament = async (id: string, raw: unknown) => {
  const data = updateSchema.parse(raw);
  const current = await getTournament(id);
  const merged = { ...current, ...data };
  const row = await queryOne(
    `UPDATE tournaments SET
       name=$2, date=$3, status=$4, location=$5,
       description=$6, rules=$7, max_teams=$8, winner_id=$9
     WHERE id=$1 RETURNING *`,
    [id, merged.name, merged.date, merged.status, merged.location,
     merged.description, merged.rules ?? null, merged.maxTeams,
     merged.winnerId ?? null],
  );
  return toTournament(row!);
};
