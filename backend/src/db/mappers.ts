// Convert snake_case rows from Postgres to camelCase domain objects.
import type {
  Player, Tournament, Team, Match,
  DraftState, DraftHistoryEntry, Group, GroupMember,
} from "../types.js";

type Row = Record<string, unknown>;

// Postgres DATE columns come back as JS Date objects; normalize to "YYYY-MM-DD".
const toDateStr = (v: unknown): string | null => {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

// Postgres TIMESTAMP columns → ISO-8601 string.
const toIso = (v: unknown): string => {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export const toPlayer = (r: Row): Player => ({
  id: r.id as string, name: r.name as string, mobile: r.mobile as string,
  username: (r.username as string | null) ?? null,
  email: (r.email as string | null) ?? null,
  role: r.role as Player["role"], position: r.position as string,
  avatar: (r.avatar as string | null) ?? null,
  isPublic: Boolean(r.is_public),
  age: r.age == null ? null : Number(r.age),
  gdprAccepted: Boolean(r.gdpr_accepted),
  gdprAcceptedAt: r.gdpr_accepted_at == null ? null : toIso(r.gdpr_accepted_at),
  pace: Number(r.pace), shooting: Number(r.shooting),
  passing: Number(r.passing), dribbling: Number(r.dribbling),
  defense: Number(r.defense), physical: Number(r.physical),
  overall: Number(r.overall),
  createdAt: toIso(r.created_at),
});

export const toTournament = (r: Row): Tournament => ({
  id: r.id as string, name: r.name as string, date: r.date as string,
  status: r.status as Tournament["status"],
  location: r.location as string, description: r.description as string,
  rules: (r.rules as string | null) ?? null,
  maxTeams: Number(r.max_teams),
  winnerId: (r.winner_id as string | null) ?? null,
  createdAt: toIso(r.created_at),
  inscriptionStart: toDateStr(r.inscription_start),
  inscriptionEnd: toDateStr(r.inscription_end),
  draftStart: toDateStr(r.draft_start),
  draftEnd: toDateStr(r.draft_end),
  matchDate: toDateStr(r.match_date),
  courtCount: Number(r.court_count ?? 1),
  halfCourt: Boolean(r.half_court ?? true),
  gameDurationMinutes: Number(r.game_duration_minutes ?? 20),
  hoursConfirmed: Boolean(r.hours_confirmed),
  teamSize: Number(r.team_size ?? 3),
  bracketFormat: (r.bracket_format as Tournament["bracketFormat"]) ?? "top2_per_group",
  bracketSize: r.bracket_size == null ? null : Number(r.bracket_size) as Tournament["bracketSize"],
  bracketQualifiersPerGroup: r.bracket_qualifiers_per_group == null
    ? null : Number(r.bracket_qualifiers_per_group),
  bracketWildcards: r.bracket_wildcards == null
    ? null : Number(r.bracket_wildcards),
  bracketLockedAt: r.bracket_locked_at == null ? null : toIso(r.bracket_locked_at),
});

export const toTeam = (r: Row): Team => ({
  id: r.id as string, tournamentId: r.tournament_id as string,
  captainId: r.captain_id as string, name: r.name as string,
  nameConfirmed: Boolean(r.name_confirmed),
  logo: (r.logo as string | null) ?? null,
  description: (r.description as string | null) ?? null,
  whatsappLink: (r.whatsapp_link as string | null) ?? null,
  whatsappGroupName: (r.whatsapp_group_name as string | null) ?? null,
  whatsappGroupLink: (r.whatsapp_group_link as string | null) ?? null,
  createdAt: toIso(r.created_at),
});

export const toMatch = (r: Row): Match => ({
  id: r.id as string, tournamentId: r.tournament_id as string,
  groupId: (r.group_id as string | null) ?? null,
  stage: r.stage as Match["stage"],
  roundNumber: r.round_number == null ? null : Number(r.round_number),
  homeTeamId: (r.home_team_id as string | null) ?? null,
  awayTeamId: (r.away_team_id as string | null) ?? null,
  homeSeedLabel: (r.home_seed_label as string | null) ?? null,
  awaySeedLabel: (r.away_seed_label as string | null) ?? null,
  homeScore: r.home_score == null ? null : Number(r.home_score),
  awayScore: r.away_score == null ? null : Number(r.away_score),
  winnerId: (r.winner_id as string | null) ?? null,
  status: r.status as Match["status"],
  durationMinutes: r.duration_minutes == null ? null : Number(r.duration_minutes),
  startedAt: r.started_at == null ? null : toIso(r.started_at),
  scheduledAt: r.scheduled_at == null ? null : toIso(r.scheduled_at),
  completedAt: r.completed_at == null ? null : toIso(r.completed_at),
  createdAt: toIso(r.created_at),
});

export const toDraftState = (r: Row): DraftState => ({
  id: r.id as string, tournamentId: r.tournament_id as string,
  teamOrder: JSON.parse(r.team_order as string) as string[],
  currentTeamIndex: Number(r.current_team_index),
  currentRound: Number(r.current_round),
  maxRounds: Number(r.max_rounds),
  isActive: r.is_active === "true" || r.is_active === true,
  roundOrderHistory: (r.round_order_history as { round: number; order: string[] }[] | null) ?? [],
  createdAt: toIso(r.created_at),
});

export const toDraftHistory = (r: Row): DraftHistoryEntry => ({
  id: r.id as string, tournamentId: r.tournament_id as string,
  teamId: r.team_id as string, playerId: r.player_id as string,
  round: Number(r.round), pickOrder: Number(r.pick_order),
  pickedAt: toIso(r.picked_at),
});

export const toGroup = (r: Row): Group => ({
  id: r.id as string, tournamentId: r.tournament_id as string,
  name: r.name as string,
  color: (r.color as string | null) ?? null,
  logo: (r.logo as string | null) ?? null,
  createdAt: toIso(r.created_at),
});

export const toGroupMember = (r: Row): GroupMember => ({
  id: r.id as string, groupId: r.group_id as string, teamId: r.team_id as string,
  points: Number(r.points), gamesPlayed: Number(r.games_played),
  gamesWon: Number(r.games_won), gamesLost: Number(r.games_lost),
  pointsFor: Number(r.points_for), pointsAgainst: Number(r.points_against),
});
