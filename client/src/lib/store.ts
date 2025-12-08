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
  password?: string; // For captains
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
  currentUser: Player | null; 
  players: Player[];
  tournaments: Tournament[];
  teams: Team[];
  
  // Actions
  registerPlayer: (player: Omit<Player, 'id' | 'role' | 'overall' | 'registeredTournaments'>) => void;
  createTournament: (tournament: Omit<Tournament, 'id' | 'playersRegistered' | 'status'>) => void;
  joinTournament: (playerId: string, tournamentId: string) => void;
  login: (identifier: string, password?: string) => boolean;
  logout: () => void;
  assignCaptain: (playerId: string, password: string) => void; 
  draftPlayer: (captainId: string, playerId: string, tournamentId: string) => void;
}

// Mock Data
const MOCK_PLAYERS: Player[] = [
  {
    id: '1',
    name: 'Alex "El Deslizador" Rivera',
    mobile: '555-0101',
    role: 'captain',
    stats: { pace: 88, shooting: 82, passing: 75, dribbling: 85, defense: 60, physical: 70 },
    overall: 80,
    registeredTournaments: ['t1'],
    password: 'password123',
    avatar: 'https://images.unsplash.com/photo-1546519638-68e109498ee3?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: '2',
    name: 'Marcos "La Torre" Johnson',
    mobile: '555-0102',
    role: 'player',
    stats: { pace: 60, shooting: 70, passing: 65, dribbling: 55, defense: 90, physical: 92 },
    overall: 78,
    registeredTournaments: ['t1'],
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: '3',
    name: 'Sara "Francotiradora" Chen',
    mobile: '555-0103',
    role: 'player',
    stats: { pace: 85, shooting: 94, passing: 78, dribbling: 80, defense: 45, physical: 50 },
    overall: 82,
    registeredTournaments: ['t1'],
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'admin',
    name: 'Comisionado de la Liga',
    mobile: 'edvardks', // Using mobile field for username for admin
    role: 'admin',
    stats: { pace: 99, shooting: 99, passing: 99, dribbling: 99, defense: 99, physical: 99 },
    overall: 99,
    registeredTournaments: [],
  }
];

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 't1',
    name: 'Clásico Callejero Villena 2024',
    date: '2024-07-15',
    status: 'open',
    location: 'Pistas Polideportivo Villena',
    description: 'El torneo legendario regresa a Villena. 5v5 cancha completa. El ganador se lo lleva todo.',
    maxTeams: 8,
    playersRegistered: ['1', '2', '3'],
  },
  {
    id: 't2',
    name: 'Liga de Invierno Indoor',
    date: '2024-12-01',
    status: 'open',
    location: 'Pabellón Cubierto Municipal',
    description: 'Liga pro-am indoor. Regístrate ahora.',
    maxTeams: 12,
    playersRegistered: [],
  },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      players: MOCK_PLAYERS,
      tournaments: MOCK_TOURNAMENTS,
      teams: [],

      login: (identifier, password) => {
        // Admin Login
        if (identifier === 'edvardks' && password === 'SX515wifi') {
          const admin = get().players.find(p => p.role === 'admin');
          if (admin) {
            set({ currentUser: admin });
            return true;
          }
        }

        // Captain/User Login
        const user = get().players.find(p => p.mobile === identifier);
        if (user) {
          // If captain, check password
          if (user.role === 'captain') {
            if (user.password === password) {
              set({ currentUser: user });
              return true;
            }
            return false;
          }
          // Regular players don't have password login in this mock requirements, 
          // but let's assume for now they can just "check in" or we only use login for Admin/Captain
          return false; 
        }
        return false;
      },

      logout: () => set({ currentUser: null }),

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

      assignCaptain: (playerId, password) => {
           set((state) => ({
              players: state.players.map(p => p.id === playerId ? { ...p, role: 'captain', password } : p)
           }))
      },

      draftPlayer: (captainId, playerId, tournamentId) => {
          console.log(`Capitán ${captainId} drafteó a ${playerId} para el torneo ${tournamentId}`);
      }
    }),
    {
      name: 'draft-league-villena-storage',
    }
  )
);
