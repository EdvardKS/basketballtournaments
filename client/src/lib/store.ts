import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, playersApi, tournamentsApi, type RegisterPlayerData, type CreateTournamentData } from './api';

export type PlayerRole = 'player' | 'captain' | 'admin';

export interface PlayerStats {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
}

export interface Player {
  id: string;
  name: string;
  mobile: string;
  username?: string | null;
  email?: string | null;
  role: PlayerRole;
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
  winnerId?: string;
  location: string;
  description: string;
  rules?: string | null;
  maxTeams: number;
}

interface AppState {
  currentUser: Player | null; 
  players: Player[];
  tournaments: Tournament[];
  
  // Actions
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setCurrentUser: (user: Player | null) => void;
  fetchPlayers: () => Promise<void>;
  fetchTournaments: () => Promise<void>;
  registerPlayer: (data: RegisterPlayerData) => Promise<Player>;
  createTournament: (data: CreateTournamentData) => Promise<Tournament>;
  updateTournament: (id: string, data: Partial<CreateTournamentData>) => Promise<Tournament>;
  deleteTournament: (id: string) => Promise<void>;
  assignCaptain: (playerId: string, password: string) => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      players: [],
      tournaments: [],

      login: async (identifier, password) => {
        try {
          const { player } = await authApi.login(identifier, password);
          set({ currentUser: player });
          return true;
        } catch (error) {
          console.error('Login failed:', error);
          return false;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
          set({ currentUser: null });
        } catch (error) {
          console.error('Logout failed:', error);
        }
      },

      setCurrentUser: (user) => set({ currentUser: user }),

      fetchPlayers: async () => {
        try {
          const { players } = await playersApi.getAll();
          set({ players });
        } catch (error) {
          console.error('Failed to fetch players:', error);
        }
      },

      fetchTournaments: async () => {
        try {
          const { tournaments } = await tournamentsApi.getAll();
          set({ tournaments });
        } catch (error) {
          console.error('Failed to fetch tournaments:', error);
        }
      },

      registerPlayer: async (data) => {
        const { player } = await playersApi.register(data);
        set((state) => ({
          players: [...state.players, player],
          currentUser: player,
        }));
        return player;
      },

      createTournament: async (data) => {
        const { tournament } = await tournamentsApi.create(data);
        set((state) => ({ tournaments: [...state.tournaments, tournament] }));
        return tournament;
      },

      updateTournament: async (id, data) => {
        const { tournament } = await tournamentsApi.update(id, data);
        set((state) => ({
          tournaments: state.tournaments.map(t => t.id === id ? tournament : t)
        }));
        return tournament;
      },

      deleteTournament: async (id) => {
        await tournamentsApi.delete(id);
        set((state) => ({
          tournaments: state.tournaments.filter(t => t.id !== id)
        }));
      },

      assignCaptain: async (playerId, password) => {
        await playersApi.promote(playerId, password);
        // Refresh players list
        await get().fetchPlayers();
      },
    }),
    {
      name: 'draft-league-villena-storage',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
