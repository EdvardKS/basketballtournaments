// Teams: read detail with roster, update name/whatsapp, admin move player.
import { z } from "zod";
import { query, queryOne, tx } from "../db/query.js";
import { toTeam } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";

export const teamPatchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  nameConfirmed: z.boolean().optional(),
  logo: z.string().max(600_000).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  whatsappLink: z.string().max(300).optional().nullable(),
  whatsappGroupName: z.string().max(120).optional().nullable(),
  whatsappGroupLink: z.string().max(300).optional().nullable(),
});

export const getTeam = async (id: string) => {
  const row = await queryOne("SELECT * FROM teams WHERE id=$1", [id]);
  if (!row) throw new HttpError(404, "TEAM_NOT_FOUND");
  return toTeam(row);
};

export const getTeamDetail = async (id: string) => {
  const team = await getTeam(id);
  const players = await query(
    `SELECT p.*, tp.drafted_at FROM team_players tp
     JOIN players p ON p.id = tp.player_id
     WHERE tp.team_id=$1 ORDER BY tp.drafted_at`, [id]);
  return { team, players };
};

export const listTeamsForTournament = async (tournamentId: string) => {
  const teams = await query(
    `SELECT t.*, json_agg(
        jsonb_build_object('id', p.id, 'name', p.name, 'overall', p.overall,
                           'position', p.position, 'avatar', p.avatar)
        ORDER BY tp.drafted_at
      ) FILTER (WHERE p.id IS NOT NULL) AS players
     FROM teams t
     LEFT JOIN team_players tp ON tp.team_id = t.id
     LEFT JOIN players p ON p.id = tp.player_id
     WHERE t.tournament_id=$1
     GROUP BY t.id ORDER BY t.name`, [tournamentId]);
  return teams.map((r) => ({
    ...toTeam(r),
    players: (r as { players: unknown[] | null }).players ?? [],
  }));
};

export const patchTeam = async (id: string, raw: unknown) => {
  const data = teamPatchSchema.parse(raw);
  const current = await getTeam(id);
  const merged = { ...current, ...data };
  const row = await queryOne(
    `UPDATE teams SET name=$2, name_confirmed=$3,
       logo=$4, description=$5, whatsapp_link=$6,
       whatsapp_group_name=$7, whatsapp_group_link=$8
     WHERE id=$1 RETURNING *`,
    [id, merged.name, merged.nameConfirmed,
     merged.logo ?? null, merged.description ?? null, merged.whatsappLink ?? null,
     merged.whatsappGroupName ?? null, merged.whatsappGroupLink ?? null]);
  return toTeam(row!);
};

export const movePlayer = async (
  fromTeamId: string | null, toTeamId: string, playerId: string,
) => tx(async (q) => {
  if (fromTeamId) {
    await q("DELETE FROM team_players WHERE team_id=$1 AND player_id=$2",
      [fromTeamId, playerId]);
  }
  const ins = await q<Record<string, unknown>>(
    `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING RETURNING *`, [toTeamId, playerId]);
  if (ins.length === 0) throw new HttpError(409, "ALREADY_IN_TEAM");
  return ins[0];
});
