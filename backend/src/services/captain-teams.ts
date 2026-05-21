// Teams a given player has captained, with their tournament context.
// Used by the captain dashboard to show team history across seasons.
import { query } from "../db/query.js";

export interface CaptainTeam {
  teamId: string; teamName: string; logo: string | null;
  description: string | null; whatsappLink: string | null;
  tournamentId: string; tournamentName: string;
  tournamentStatus: string;
  matchDate: string | null;
  createdAt: string;
}

const toIso = (v: unknown): string => {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export const listCaptainTeams = async (playerId: string): Promise<CaptainTeam[]> => {
  const rows = await query<{
    team_id: string; team_name: string; logo: string | null;
    description: string | null; whatsapp_link: string | null;
    tournament_id: string; tournament_name: string; tournament_status: string;
    match_date: string | Date | null; created_at: string | Date;
  }>(
    `SELECT
       tm.id   AS team_id,
       tm.name AS team_name,
       tm.logo,
       tm.description,
       tm.whatsapp_link,
       t.id     AS tournament_id,
       t.name   AS tournament_name,
       t.status AS tournament_status,
       t.match_date,
       tm.created_at
     FROM teams tm
     JOIN tournaments t ON t.id = tm.tournament_id
     WHERE tm.captain_id = $1
     ORDER BY t.match_date DESC NULLS LAST, tm.created_at DESC`,
    [playerId],
  );
  return rows.map((r) => ({
    teamId: r.team_id, teamName: r.team_name, logo: r.logo,
    description: r.description, whatsappLink: r.whatsapp_link,
    tournamentId: r.tournament_id, tournamentName: r.tournament_name,
    tournamentStatus: r.tournament_status,
    matchDate: r.match_date == null
      ? null
      : (r.match_date instanceof Date ? r.match_date.toISOString().slice(0, 10) : String(r.match_date).slice(0, 10)),
    createdAt: toIso(r.created_at),
  }));
};
