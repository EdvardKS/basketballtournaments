// Frontend domain types — mirrors backend with privacy-aware player variants.
export type Role = "player" | "captain" | "admin";
export type TournamentStatus =
  | "upcoming" | "open" | "draft" | "setup" | "scheduled" | "active" | "completed";
export type MatchStage = "group" | "eighth" | "quarterfinal" | "semifinal" | "final" | "third_place";
export type BracketFormat =
  | "top2_per_group"
  | "top1_plus_best2_seconds"
  | "top2_single_group"
  | "top4_single_group";
export type BracketSize = 2 | 4 | 8 | 16;
export type MatchStatus = "pending" | "in_progress" | "completed";

export interface Player {
  id: string; name: string; mobile: string; username: string | null;
  email: string | null; role: Role; position: string;
  avatar: string | null; isPublic: boolean;
  age: number | null; gdprAccepted: boolean; gdprAcceptedAt: string | null;
  pace: number; shooting: number; passing: number;
  dribbling: number; defense: number; physical: number; overall: number;
  canEditStats: boolean; archivedAt: string | null;
  createdAt: string;
}

export type AchievementKind =
  | "participated" | "champion" | "runner_up" | "third_place" | "mvp" | "custom";

export interface Achievement {
  id: string | null;
  kind: AchievementKind;
  tournamentId: string;
  tournamentName: string;
  year: number;
  label: string | null;
  note: string | null;
  awardedAt: string | null;
}

// Minimum visible info when anonymous
export interface PublicPlayer {
  id: string; avatar: string | null; position: string; overall: number;
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
  bracketFormat: BracketFormat;
  bracketSize: BracketSize | null;
  bracketQualifiersPerGroup: number | null;
  bracketWildcards: number | null;
  bracketLockedAt: string | null;
}

export interface Team {
  id: string; tournamentId: string; captainId: string; name: string;
  nameConfirmed: boolean; logo: string | null; description: string | null;
  whatsappLink: string | null; createdAt: string;
}

export interface TeamWithPlayers extends Team {
  players: { id: string; name?: string; avatar: string | null; position: string; overall: number }[];
}

export interface Match {
  id: string; tournamentId: string; groupId: string | null;
  stage: MatchStage; roundNumber: number | null;
  homeTeamId: string | null; awayTeamId: string | null;
  homeTeamName?: string; awayTeamName?: string;
  homeTeamLogo?: string | null; awayTeamLogo?: string | null;
  homeSeedLabel?: string | null; awaySeedLabel?: string | null;
  homeScore: number | null; awayScore: number | null;
  winnerId: string | null; status: MatchStatus;
  scheduledAt: string | null; completedAt: string | null;
}

export interface GroupMember {
  id: string; groupId: string; teamId: string; teamName?: string; teamLogo?: string | null;
  points: number; gamesPlayed: number; gamesWon: number; gamesLost: number;
  pointsFor: number; pointsAgainst: number;
}

export interface GroupWithMembers {
  group: { id: string; name: string; color?: string | null; logo?: string | null };
  members: GroupMember[];
}

export interface DraftState {
  id: string; tournamentId: string;
  teamOrder: string[]; currentTeamIndex: number;
  currentRound: number; isActive: boolean;
  roundOrderHistory: { round: number; order: string[] }[];
}

export interface TournamentDetail {
  tournament: Tournament;
  registrations: unknown[];
  teams: TeamWithPlayers[];
}
