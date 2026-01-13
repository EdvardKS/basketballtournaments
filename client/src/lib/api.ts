// API Client for Basketball Tournament App

export interface Player {
  id: string;
  name: string;
  mobile: string;
  username?: string | null;
  email?: string | null;
  role: 'player' | 'captain' | 'admin';
  isPublic?: boolean;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  overall: number;
  avatar?: string;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  status: 'open' | 'draft' | 'active' | 'completed';
  location: string;
  description: string;
  maxTeams: number;
  winnerId?: string;
}

export interface RegisterPlayerData {
  name: string;
  mobile: string;
  username: string;
  email: string;
  password: string;
  isPublic?: boolean;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  avatar?: string;
  tournamentId?: string; // Optional, to register directly to a tournament
}

export interface CreateTournamentData {
  name: string;
  date: string;
  location: string;
  description: string;
  maxTeams: number;
  status?: string;
}

// Auth API
export const authApi = {
  async login(identifier: string, password: string): Promise<{ player: Player }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
  },

  async me(): Promise<{ player: Player } | null> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    return res.json();
  },
};

// Players API
export const playersApi = {
  async getAll(): Promise<{ players: Player[] }> {
    const res = await fetch('/api/players');
    if (!res.ok) throw new Error('Failed to fetch players');
    return res.json();
  },

  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const params = new URLSearchParams({ username });
    const res = await fetch(`/api/players/availability?${params}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Availability check failed');
    }
    return res.json();
  },

  async register(data: RegisterPlayerData): Promise<{ player: Player }> {
    const res = await fetch('/api/players/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Registration failed');
    }
    return res.json();
  },

  async promote(playerId: string, password: string): Promise<{ player: Player }> {
    const res = await fetch(`/api/players/${playerId}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Promotion failed');
    }
    return res.json();
  },

  async update(id: string, data: Partial<RegisterPlayerData>): Promise<{ player: Player }> {
    const res = await fetch(`/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update player');
    return res.json();
  },

  async updatePublic(id: string, isPublic: boolean): Promise<{ player: Player }> {
    const res = await fetch(`/api/players/${id}/public`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update profile visibility');
    }
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/players/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete player');
  },

  async getTournaments(playerId: string): Promise<{ tournaments: Tournament[] }> {
    const res = await fetch(`/api/players/${playerId}/tournaments`);
    if (!res.ok) throw new Error('Failed to fetch player tournaments');
    return res.json();
  },
};

// Tournaments API
export const tournamentsApi = {
  async getAll(): Promise<{ tournaments: Tournament[] }> {
    const res = await fetch('/api/tournaments');
    if (!res.ok) throw new Error('Failed to fetch tournaments');
    return res.json();
  },

  async getById(id: string): Promise<{ tournament: Tournament; registeredPlayers: Player[] }> {
    const res = await fetch(`/api/tournaments/${id}`);
    if (!res.ok) throw new Error('Failed to fetch tournament');
    return res.json();
  },

  async create(data: CreateTournamentData): Promise<{ tournament: Tournament }> {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create tournament');
    }
    return res.json();
  },

  async update(id: string, data: Partial<CreateTournamentData>): Promise<{ tournament: Tournament }> {
    const res = await fetch(`/api/tournaments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update tournament');
    }
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/tournaments/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete tournament');
    }
  },

  async register(tournamentId: string, playerId: string): Promise<void> {
    const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to register for tournament');
    }
  },
};

// Teams API
export interface Team {
  id: string;
  tournamentId: string;
  captainId: string;
  name: string;
  nameConfirmed?: boolean;
}

export const teamsApi = {
  async getForTournament(tournamentId: string): Promise<{ teams: Team[] }> {
    const res = await fetch(`/api/tournaments/${tournamentId}/teams`);
    if (!res.ok) throw new Error('Failed to fetch teams');
    return res.json();
  },

  async create(data: { tournamentId: string; captainId: string; name: string }): Promise<{ team: Team }> {
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create team');
    }
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete team');
  },

  async getByCaptain(captainId: string, tournamentId?: string): Promise<{ team: Team; players: Player[] }> {
    const params = tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : "";
    const res = await fetch(`/api/teams/captain/${captainId}${params}`);
    if (!res.ok) throw new Error('No team found');
    return res.json();
  },

  async updateName(teamId: string, name: string): Promise<{ team: Team; groupsGenerated?: boolean }> {
    const res = await fetch(`/api/teams/${teamId}/name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update team name');
    }
    return res.json();
  },
};

// Draft API
export interface DraftState {
  id: string;
  tournamentId: string;
  teamOrder: string;
  currentTeamIndex: number;
  currentRound: number;
  maxRounds: number;
  isActive: string;
}

export interface DraftHistory {
  id: string;
  tournamentId: string;
  teamId: string;
  playerId: string;
  round: number;
  pickOrder: number;
  pickedAt: string;
}

export interface DraftStateResponse {
  draftState: DraftState;
  currentTeam: Team | null;
  currentCaptain: Player | null;
  teams: Team[];
  history: DraftHistory[];
  teamOrder: string[];
}

export const draftApi = {
  async start(tournamentId: string, maxRounds: number = 5): Promise<{ draftState: DraftState; teams: Team[] }> {
    const res = await fetch(`/api/draft/start/${tournamentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxRounds }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to start draft');
    }
    return res.json();
  },

  async getState(tournamentId: string): Promise<DraftStateResponse> {
    const res = await fetch(`/api/draft/state/${tournamentId}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to get draft state');
    }
    return res.json();
  },

  async draftPlayer(teamId: string, playerId: string): Promise<{ draftComplete?: boolean; message?: string }> {
    const res = await fetch('/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, playerId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to draft player');
    }
    return res.json();
  },

  async end(tournamentId: string): Promise<void> {
    const res = await fetch(`/api/draft/end/${tournamentId}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to end draft');
    }
  },
};

// Tournament Registration with captain info
export interface TournamentRegistration {
  id: string;
  playerId: string;
  tournamentId: string;
  isCaptain: boolean;
  teamName: string | null;
  registeredAt: string;
  player: Player;
}

// Tournament Groups and Matches
export interface TournamentGroup {
  id: string;
  tournamentId: string;
  name: string;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  teamId: string;
  points: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  team: Team;
}

export interface Match {
  id: string;
  tournamentId: string;
  groupId: string | null;
  stage: 'group' | 'quarterfinal' | 'semifinal' | 'final' | 'third_place';
  roundNumber: number | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  durationMinutes?: number | null;
  startedAt?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
}

export interface PlayerSkillSnapshot {
  id: string;
  playerId: string;
  tournamentId: string;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  overall: number;
  snapshotAt: string;
}

// Extended Tournaments API with new endpoints
export const registrationsApi = {
  async getForTournament(tournamentId: string): Promise<{ registrations: TournamentRegistration[] }> {
    const res = await fetch(`/api/tournaments/${tournamentId}/registrations`);
    if (!res.ok) throw new Error('Failed to fetch registrations');
    return res.json();
  },

  async getCaptains(tournamentId: string): Promise<{ captains: TournamentRegistration[] }> {
    const res = await fetch(`/api/tournaments/${tournamentId}/captains`);
    if (!res.ok) throw new Error('Failed to fetch captains');
    return res.json();
  },

  async setCaptain(tournamentId: string, playerId: string, isCaptain: boolean, teamName?: string): Promise<{ registration: TournamentRegistration }> {
    const res = await fetch(`/api/tournaments/${tournamentId}/captains/${playerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCaptain, teamName }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to set captain');
    }
    return res.json();
  },
};

// Groups API
export const groupsApi = {
  async getForTournament(tournamentId: string): Promise<{ groups: TournamentGroup[] }> {
    const res = await fetch(`/api/tournaments/${tournamentId}/groups`);
    if (!res.ok) throw new Error('Failed to fetch groups');
    return res.json();
  },

  async generate(tournamentId: string): Promise<{ groups: TournamentGroup[] }> {
    const res = await fetch(`/api/tournaments/${tournamentId}/groups/generate`, {
      method: 'POST',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to generate groups');
    }
    return res.json();
  },
};

// Matches API
export const matchesApi = {
  async getForTournament(tournamentId: string): Promise<{ matches: Match[] }> {
    const res = await fetch(`/api/tournaments/${tournamentId}/matches`);
    if (!res.ok) throw new Error('Failed to fetch matches');
    return res.json();
  },

  async start(matchId: string, durationMinutes: number): Promise<{ match: Match }> {
    const res = await fetch(`/api/matches/${matchId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationMinutes }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to start match');
    }
    return res.json();
  },

  async updateScore(matchId: string, homeScore: number, awayScore: number): Promise<{ match: Match }> {
    const res = await fetch(`/api/matches/${matchId}/score`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeScore, awayScore }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update match score');
    }
    return res.json();
  },

  async updateResult(matchId: string, homeScore: number, awayScore: number): Promise<{ match: Match }> {
    const res = await fetch(`/api/matches/${matchId}/result`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeScore, awayScore }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update match result');
    }
    return res.json();
  },
};

// Admin Analytics API
export interface PlayerStats {
  player: Player;
  tournamentsPlayed: number;
  snapshots: PlayerSkillSnapshot[];
  growth: number;
}

export const adminApi = {
  async getPlayerHistory(filters?: { role?: string; tournamentId?: string }): Promise<{
    playerStats: PlayerStats[];
    totalPlayers: number;
    totalTournaments: number;
    activeTournaments: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.tournamentId) params.append('tournamentId', filters.tournamentId);
    
    const res = await fetch(`/api/admin/player-history?${params}`);
    if (!res.ok) throw new Error('Failed to fetch player history');
    return res.json();
  },
};

// Player History API (for individual players)
export const playerHistoryApi = {
  async getSnapshots(playerId: string): Promise<{ snapshots: PlayerSkillSnapshot[] }> {
    const res = await fetch(`/api/players/${playerId}/history`);
    if (!res.ok) throw new Error('Failed to fetch player history');
    return res.json();
  },
};
