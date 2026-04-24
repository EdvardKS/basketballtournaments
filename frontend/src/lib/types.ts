// Shared domain types mirroring the backend's types.ts
export type Role = "player" | "captain" | "admin";
export type TournamentStatus =
  | "open" | "draft" | "setup" | "scheduled" | "active" | "completed";
export type MatchStatus = "pending" | "in_progress" | "completed";

export interface Player {
  id: string; name: string; mobile: string;
  username: string | null; email: string | null;
  role: Role; position: string;
  avatar: string | null; isPublic: boolean;
  pace: number; shooting: number; passing: number;
  dribbling: number; defense: number; physical: number; overall: number;
  createdAt: string;
}

export interface Tournament {
  id: string; name: string; date: string;
  status: TournamentStatus;
  location: string; description: string;
  rules: string | null; maxTeams: number;
  winnerId: string | null; createdAt: string;
}

export interface TeamWithPlayers {
  id: string; tournamentId: string; captainId: string;
  name: string; nameConfirmed: boolean;
  whatsappGroupName: string | null; whatsappGroupLink: string | null;
  createdAt: string;
  players: Array<{ id: string; name: string; overall: number; position: string }>;
}

export interface TournamentDetail {
  tournament: Tournament;
  registrations: Array<{
    id: string; player_id: string; tournament_id: string;
    is_captain: boolean; team_name: string | null;
    name: string; mobile: string;
    pace: number; shooting: number; passing: number;
    dribbling: number; defense: number; physical: number; overall: number;
    is_public: boolean; avatar: string | null;
  }>;
  teams: TeamWithPlayers[];
}

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  open: "Inscripciones",
  draft: "Draft en curso",
  setup: "Configurando equipos",
  scheduled: "Programado",
  active: "En juego",
  completed: "Finalizado",
};

export const STATUS_COLOR: Record<TournamentStatus, string> = {
  open: "bg-court-ok/20 text-court-ok",
  draft: "bg-amber-500/20 text-amber-300",
  setup: "bg-indigo-500/20 text-indigo-300",
  scheduled: "bg-sky-500/20 text-sky-300",
  active: "bg-court-accent/20 text-court-accent",
  completed: "bg-slate-500/20 text-slate-300",
};
