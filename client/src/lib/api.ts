// API Client for Basketball Tournament App

interface Player {
  id: string;
  name: string;
  mobile: string;
  role: 'player' | 'captain' | 'admin';
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  overall: number;
  avatar?: string;
}

interface Tournament {
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

// Draft API
export const draftApi = {
  async draftPlayer(teamId: string, playerId: string): Promise<void> {
    const res = await fetch('/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, playerId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to draft player');
    }
  },
};
