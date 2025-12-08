import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  role: PlayerRole;
  stats: PlayerStats;
  overall: number;
  avatar?: string;
  registeredTournaments: string[]; // Tournament IDs
}

export interface Team {
  id: string;
  tournamentId: string;
  captainId: string;
  name: string;
  playerIds: string[];
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  status: 'open' | 'draft' | 'active' | 'completed';
  winnerId?: string; // Team ID
  location: string;
  description: string;
  maxTeams: number;
  playersRegistered: string[]; // Player IDs
}

interface AppState {
  currentUser: Player | null; // For simulation
  players: Player[];
  tournaments: Tournament[];
  teams: Team[];
  
  // Actions
  registerPlayer: (player: Omit<Player, 'id' | 'role' | 'overall' | 'registeredTournaments'>) => void;
  createTournament: (tournament: Omit<Tournament, 'id' | 'playersRegistered' | 'status'>) => void;
  joinTournament: (playerId: string, tournamentId: string) => void;
  setCurrentUser: (user: Player | null) => void;
  assignCaptain: (playerId: string, tournamentId: string) => void; // Promotes to captain for that tournament context (simplified for now)
  draftPlayer: (captainId: string, playerId: string, tournamentId: string) => void;
}

// Mock Data
const MOCK_PLAYERS: Player[] = [
  {
    id: '1',
    name: 'Alex "The Glide" Rivera',
    mobile: '555-0101',
    role: 'captain',
    stats: { pace: 88, shooting: 82, passing: 75, dribbling: 85, defense: 60, physical: 70 },
    overall: 80,
    registeredTournaments: ['t1'],
  },
  {
    id: '2',
    name: 'Marcus "Tower" Johnson',
    mobile: '555-0102',
    role: 'player',
    stats: { pace: 60, shooting: 70, passing: 65, dribbling: 55, defense: 90, physical: 92 },
    overall: 78,
    registeredTournaments: ['t1'],
  },
  {
    id: '3',
    name: 'Sarah "Sniper" Chen',
    mobile: '555-0103',
    role: 'player',
    stats: { pace: 85, shooting: 94, passing: 78, dribbling: 80, defense: 45, physical: 50 },
    overall: 82,
    registeredTournaments: ['t1'],
  },
    {
    id: '4',
    name: 'David "Handles" Kim',
    mobile: '555-0104',
    role: 'player',
    stats: { pace: 90, shooting: 75, passing: 88, dribbling: 92, defense: 55, physical: 60 },
    overall: 81,
    registeredTournaments: ['t1'],
  },
  {
    id: 'admin',
    name: 'League Commissioner',
    mobile: '000-0000',
    role: 'admin',
    stats: { pace: 99, shooting: 99, passing: 99, dribbling: 99, defense: 99, physical: 99 },
    overall: 99,
    registeredTournaments: [],
  }
];

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 't1',
    name: 'Summer Streetball Classic 2024',
    date: '2024-07-15',
    status: 'open',
    location: 'Rucker Park, NYC',
    description: 'The legendary tournament returns. 5v5 full court. Winner takes all.',
    maxTeams: 8,
    playersRegistered: ['1', '2', '3', '4'],
  },
  {
    id: 't2',
    name: 'Winter Indoor League',
    date: '2024-12-01',
    status: 'open',
    location: 'Downtown Arena',
    description: 'Indoor pro-am league. Register now.',
    maxTeams: 12,
    playersRegistered: [],
  },
    {
    id: 't3',
    name: 'Spring Draft 2023',
    date: '2023-04-20',
    status: 'completed',
    location: 'City Gym',
    description: 'Last season championships.',
    maxTeams: 6,
    playersRegistered: [],
    winnerId: 'team1'
  },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: MOCK_PLAYERS[4], // Default as admin for demo
      players: MOCK_PLAYERS,
      tournaments: MOCK_TOURNAMENTS,
      teams: [],

      setCurrentUser: (user) => set({ currentUser: user }),

      registerPlayer: (newPlayer) => set((state) => {
        const id = Math.random().toString(36).substr(2, 9);
        const overall = Math.round(
          (newPlayer.stats.pace + newPlayer.stats.shooting + newPlayer.stats.passing + 
           newPlayer.stats.dribbling + newPlayer.stats.defense + newPlayer.stats.physical) / 6
        );
        return {
          players: [...state.players, { ...newPlayer, id, role: 'player', overall, registeredTournaments: [] }]
        };
      }),

      createTournament: (newTournament) => set((state) => {
        const id = Math.random().toString(36).substr(2, 9);
        return {
          tournaments: [...state.tournaments, { ...newTournament, id, status: 'open', playersRegistered: [] }]
        };
      }),

      joinTournament: (playerId, tournamentId) => set((state) => ({
        tournaments: state.tournaments.map(t => 
          t.id === tournamentId 
            ? { ...t, playersRegistered: [...t.playersRegistered, playerId] }
            : t
        ),
        players: state.players.map(p =>
            p.id === playerId
            ? { ...p, registeredTournaments: [...p.registeredTournaments, tournamentId] }
            : p
        )
      })),

      assignCaptain: (playerId, tournamentId) => {
          // Logic to assign captain role for specific tournament context would go here
          // For now just updating global role for demo
           set((state) => ({
              players: state.players.map(p => p.id === playerId ? { ...p, role: 'captain' } : p)
           }))
      },

      draftPlayer: (captainId, playerId, tournamentId) => {
          // Logic for drafting
          console.log(`Captain ${captainId} drafted ${playerId} for tournament ${tournamentId}`);
      }
    }),
    {
      name: 'draft-league-storage',
    }
  )
);
