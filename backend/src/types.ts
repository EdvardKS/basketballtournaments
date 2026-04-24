// Domain types mirroring Postgres rows (snake_case → camelCase in db/mappers.ts)
export type Role = "player" | "captain" | "admin";
export type TournamentStatus =
  | "upcoming" | "open" | "draft" | "setup" | "scheduled" | "active" | "completed";
export type MatchStage = "group" | "quarterfinal" | "semifinal" | "final" | "third_place";
export type MatchStatus = "pending" | "in_progress" | "completed";

export interface Player {
  id: string; name: string; mobile: string; username: string | null;
  email: string | null; role: Role; position: string;
  avatar: string | null; isPublic: boolean;
  age: number | null; gdprAccepted: boolean; gdprAcceptedAt: string | null;
  pace: number; shooting: number; passing: number;
  dribbling: number; defense: number; physical: number; overall: number;
  createdAt: string;
}

export interface Tournament {
  id: string; name: string; date: string; status: TournamentStatus;
  location: string; description: string; rules: string | null;
  maxTeams: number; winnerId: string | null; createdAt: string;
  inscriptionStart: string | null; inscriptionEnd: string | null;
  draftStart: string | null; draftEnd: string | null; matchDate: string | null;
  courtCount: number; halfCourt: boolean;
  gameDurationMinutes: number; hoursConfirmed: boolean;
  teamSize: number;
}

export interface Team {
  id: string; tournamentId: string; captainId: string; name: string;
  nameConfirmed: boolean; logo: string | null; description: string | null;
  whatsappLink: string | null; whatsappGroupName: string | null;
  whatsappGroupLink: string | null; createdAt: string;
}

export interface Match {
  id: string; tournamentId: string; groupId: string | null;
  stage: MatchStage; roundNumber: number | null;
  homeTeamId: string | null; awayTeamId: string | null;
  homeScore: number | null; awayScore: number | null;
  winnerId: string | null; status: MatchStatus;
  durationMinutes: number | null;
  startedAt: string | null; scheduledAt: string | null;
  completedAt: string | null; createdAt: string;
}

export interface DraftState {
  id: string; tournamentId: string;
  teamOrder: string[]; currentTeamIndex: number;
  currentRound: number; maxRounds: number; isActive: boolean;
  roundOrderHistory: { round: number; order: string[] }[];
  createdAt: string;
}

export interface DraftHistoryEntry {
  id: string; tournamentId: string; teamId: string; playerId: string;
  round: number; pickOrder: number; pickedAt: string;
}

export interface Group {
  id: string; tournamentId: string; name: string; createdAt: string;
}

export interface GroupMember {
  id: string; groupId: string; teamId: string;
  points: number; gamesPlayed: number; gamesWon: number; gamesLost: number;
  pointsFor: number; pointsAgainst: number;
}

declare module "express-session" {
  interface SessionData { playerId?: string; role?: Role }
}
