// Convert snake_case rows from Postgres to camelCase domain objects.
import type { Player, Tournament, Team, Match } from "../types.js";

type Row = Record<string, unknown>;

export const toPlayer = (r: Row): Player => ({
  id: r.id as string, name: r.name as string, mobile: r.mobile as string,
  username: (r.username as string | null) ?? null,
  email: (r.email as string | null) ?? null,
  role: r.role as Player["role"], position: r.position as string,
  avatar: (r.avatar as string | null) ?? null,
  isPublic: Boolean(r.is_public),
  pace: Number(r.pace), shooting: Number(r.shooting),
  passing: Number(r.passing), dribbling: Number(r.dribbling),
  defense: Number(r.defense), physical: Number(r.physical),
  overall: Number(r.overall),
  createdAt: String(r.created_at),
});

export const toTournament = (r: Row): Tournament => ({
  id: r.id as string, name: r.name as string, date: r.date as string,
  status: r.status as Tournament["status"],
  location: r.location as string, description: r.description as string,
  rules: (r.rules as string | null) ?? null,
  maxTeams: Number(r.max_teams),
  winnerId: (r.winner_id as string | null) ?? null,
  createdAt: String(r.created_at),
});

export const toTeam = (r: Row): Team => ({
  id: r.id as string, tournamentId: r.tournament_id as string,
  captainId: r.captain_id as string, name: r.name as string,
  nameConfirmed: Boolean(r.name_confirmed),
  whatsappGroupName: (r.whatsapp_group_name as string | null) ?? null,
  whatsappGroupLink: (r.whatsapp_group_link as string | null) ?? null,
  createdAt: String(r.created_at),
});

export const toMatch = (r: Row): Match => ({
  id: r.id as string, tournamentId: r.tournament_id as string,
  groupId: (r.group_id as string | null) ?? null,
  stage: r.stage as Match["stage"],
  roundNumber: r.round_number == null ? null : Number(r.round_number),
  homeTeamId: (r.home_team_id as string | null) ?? null,
  awayTeamId: (r.away_team_id as string | null) ?? null,
  homeScore: r.home_score == null ? null : Number(r.home_score),
  awayScore: r.away_score == null ? null : Number(r.away_score),
  winnerId: (r.winner_id as string | null) ?? null,
  status: r.status as Match["status"],
  durationMinutes: r.duration_minutes == null ? null : Number(r.duration_minutes),
  startedAt: r.started_at == null ? null : String(r.started_at),
  scheduledAt: r.scheduled_at == null ? null : String(r.scheduled_at),
  completedAt: r.completed_at == null ? null : String(r.completed_at),
  createdAt: String(r.created_at),
});
