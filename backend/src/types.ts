// Domain types mirroring the Postgres rows (snake_case → camelCase mapper lives in db/mappers.ts)
export type Role = "player" | "captain" | "admin";
export type TournamentStatus =
  | "open" | "draft" | "setup" | "scheduled" | "active" | "completed";
export type MatchStage = "group" | "quarterfinal" | "semifinal" | "final" | "third_place";
export type MatchStatus = "pending" | "in_progress" | "completed";
export type TradeStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface Player {
  id: string; name: string; mobile: string; username: string | null;
  email: string | null; role: Role; position: string;
  avatar: string | null; isPublic: boolean;
  pace: number; shooting: number; passing: number;
  dribbling: number; defense: number; physical: number; overall: number;
  createdAt: string;
}

export interface Tournament {
  id: string; name: string; date: string; status: TournamentStatus;
  location: string; description: string; rules: string | null;
  maxTeams: number; winnerId: string | null; createdAt: string;
}

export interface Team {
  id: string; tournamentId: string; captainId: string; name: string;
  nameConfirmed: boolean; whatsappGroupName: string | null;
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

declare module "express-session" {
  interface SessionData { playerId?: string; role?: Role }
}
