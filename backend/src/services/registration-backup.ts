// CSV backup of tournament registrations. Rebuilt from the DB after every
// registration/captain change so the file is always a consistent snapshot.
// Filename = tournament match_date (YYYY-MM-DD), falling back to tournament.date,
// finally to the tournament id when both date columns are null.
//
// Best-effort: failures are logged and swallowed — the API response must
// not break if the disk is read-only / volume missing.

import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { query, queryOne } from "../db/query.js";

const BACKUP_DIR = process.env.CSV_BACKUP_DIR ?? "/app/data/csv";

let dirEnsured = false;
const ensureDir = async () => {
  if (dirEnsured) return;
  await mkdir(BACKUP_DIR, { recursive: true });
  dirEnsured = true;
};

const csvEscape = (v: unknown): string => {
  if (v == null) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const COLUMNS = [
  "registered_at",
  "tournament_id",
  "tournament_name",
  "tournament_match_date",
  "tournament_status",
  "player_id",
  "name",
  "mobile",
  "email",
  "age",
  "position",
  "is_captain",
  "team_id",
  "team_name",
  "player_role",
  "gdpr_accepted",
  "gdpr_accepted_at",
  "pace",
  "shooting",
  "passing",
  "dribbling",
  "defense",
  "physical",
  "overall",
  "player_created_at",
] as const;

interface RegRow extends Record<string, unknown> {
  registered_at: Date | string;
  player_id: string;
  is_captain: boolean;
  team_name: string | null;
  player_name: string;
  mobile: string;
  email: string | null;
  age: number | null;
  position: string;
  player_role: string;
  gdpr_accepted: boolean;
  gdpr_accepted_at: Date | string | null;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  overall: number;
  player_created_at: Date | string;
  team_id: string | null;
}

const sanitizeFilename = (raw: string): string =>
  raw.replace(/[^a-zA-Z0-9._-]/g, "_");

export const exportTournamentRegistrationsCsv = async (
  tournamentId: string,
): Promise<string | null> => {
  try {
    const t = await queryOne<{
      id: string;
      name: string;
      match_date: Date | string | null;
      date: string | null;
      status: string;
    }>(
      `SELECT id, name, match_date, date, status
       FROM tournaments WHERE id = $1`,
      [tournamentId],
    );
    if (!t) return null;

    const matchDateStr =
      t.match_date instanceof Date
        ? t.match_date.toISOString().slice(0, 10)
        : t.match_date
          ? String(t.match_date).slice(0, 10)
          : null;
    const fallbackDate = t.date ? String(t.date).slice(0, 10) : null;
    const baseName = matchDateStr ?? fallbackDate ?? t.id;

    const rows = await query<RegRow>(
      `SELECT r.registered_at, r.is_captain, r.team_name,
              p.id AS player_id, p.name AS player_name, p.mobile, p.email,
              p.age, p.position, p.role AS player_role,
              p.gdpr_accepted, p.gdpr_accepted_at,
              p.pace, p.shooting, p.passing, p.dribbling, p.defense,
              p.physical, p.overall, p.created_at AS player_created_at,
              tm.id AS team_id
       FROM tournament_registrations r
       JOIN players p ON p.id = r.player_id
       LEFT JOIN teams tm
         ON tm.tournament_id = r.tournament_id AND tm.captain_id = p.id
       WHERE r.tournament_id = $1
       ORDER BY r.registered_at ASC`,
      [tournamentId],
    );

    const header = COLUMNS.join(",");
    const body = rows
      .map((r) =>
        [
          r.registered_at,
          t.id,
          t.name,
          matchDateStr,
          t.status,
          r.player_id,
          r.player_name,
          r.mobile,
          r.email,
          r.age,
          r.position,
          r.is_captain ? "yes" : "no",
          r.team_id,
          r.team_name,
          r.player_role,
          r.gdpr_accepted ? "yes" : "no",
          r.gdpr_accepted_at,
          r.pace,
          r.shooting,
          r.passing,
          r.dribbling,
          r.defense,
          r.physical,
          r.overall,
          r.player_created_at,
        ]
          .map(csvEscape)
          .join(","),
      )
      .join("\n");
    const content = body ? `${header}\n${body}\n` : `${header}\n`;

    await ensureDir();
    const filename = `${sanitizeFilename(baseName)}.csv`;
    const finalPath = join(BACKUP_DIR, filename);
    const tmpPath = `${finalPath}.tmp`;
    await writeFile(tmpPath, content, "utf8");
    await rename(tmpPath, finalPath);
    return finalPath;
  } catch (err) {
    console.warn(
      "[csv-backup] export failed for tournament",
      tournamentId,
      (err as Error).message,
    );
    return null;
  }
};
