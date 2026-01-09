import { 
  type Player, type InsertPlayer,
  type Tournament, type InsertTournament,
  type TournamentRegistration, type InsertTournamentRegistration,
  type Team, type InsertTeam,
  type TeamPlayer, type InsertTeamPlayer,
  players, tournaments, tournamentRegistrations, teams, teamPlayers
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // Players
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByMobile(mobile: string): Promise<Player | undefined>;
  getAllPlayers(): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: string, player: Partial<InsertPlayer>): Promise<Player | undefined>;
  deletePlayer(id: string): Promise<boolean>;
  promotePlayerToCaptain(id: string, password: string): Promise<Player | undefined>;
  
  // Tournaments
  getTournament(id: string): Promise<Tournament | undefined>;
  getAllTournaments(): Promise<Tournament[]>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: string, tournament: Partial<InsertTournament>): Promise<Tournament | undefined>;
  deleteTournament(id: string): Promise<boolean>;
  
  // Tournament Registrations
  registerPlayerToTournament(playerId: string, tournamentId: string): Promise<TournamentRegistration>;
  getPlayersForTournament(tournamentId: string): Promise<Player[]>;
  getTournamentsForPlayer(playerId: string): Promise<Tournament[]>;
  
  // Teams
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  deleteTeam(id: string): Promise<boolean>;
  getTeamsForTournament(tournamentId: string): Promise<Team[]>;
  getTeamByCaptain(captainId: string): Promise<Team | undefined>;
  
  // Draft
  draftPlayer(teamId: string, playerId: string): Promise<TeamPlayer>;
  getPlayersForTeam(teamId: string): Promise<Player[]>;
  getDraftedPlayerIds(tournamentId: string): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  // Players
  async getPlayer(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async getPlayerByMobile(mobile: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.mobile, mobile));
    return player;
  }

  async getAllPlayers(): Promise<Player[]> {
    return await db.select().from(players);
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    // Calculate overall from stats
    const pace = insertPlayer.pace ?? 50;
    const shooting = insertPlayer.shooting ?? 50;
    const passing = insertPlayer.passing ?? 50;
    const dribbling = insertPlayer.dribbling ?? 50;
    const defense = insertPlayer.defense ?? 50;
    const physical = insertPlayer.physical ?? 50;
    
    const overall = Math.round((pace + shooting + passing + dribbling + defense + physical) / 6);
    
    const [player] = await db.insert(players).values({
      ...insertPlayer,
      pace,
      shooting,
      passing,
      dribbling,
      defense,
      physical,
      overall,
    }).returning();
    return player!;
  }

  async updatePlayer(id: string, playerUpdate: Partial<InsertPlayer>): Promise<Player | undefined> {
    // Recalculate overall if stats changed
    let overall = undefined;
    if (playerUpdate.pace !== undefined || playerUpdate.shooting !== undefined || 
        playerUpdate.passing !== undefined || playerUpdate.dribbling !== undefined ||
        playerUpdate.defense !== undefined || playerUpdate.physical !== undefined) {
      const existing = await this.getPlayer(id);
      if (existing) {
        const newPace = playerUpdate.pace ?? existing.pace;
        const newShooting = playerUpdate.shooting ?? existing.shooting;
        const newPassing = playerUpdate.passing ?? existing.passing;
        const newDribbling = playerUpdate.dribbling ?? existing.dribbling;
        const newDefense = playerUpdate.defense ?? existing.defense;
        const newPhysical = playerUpdate.physical ?? existing.physical;
        overall = Math.round((newPace + newShooting + newPassing + newDribbling + newDefense + newPhysical) / 6);
      }
    }

    const [player] = await db.update(players)
      .set({ ...playerUpdate, ...(overall !== undefined && { overall }) })
      .where(eq(players.id, id))
      .returning();
    return player;
  }

  async promotePlayerToCaptain(id: string, password: string): Promise<Player | undefined> {
    const [player] = await db.update(players)
      .set({ role: 'captain', password })
      .where(eq(players.id, id))
      .returning();
    return player;
  }

  async deletePlayer(id: string): Promise<boolean> {
    await db.delete(players).where(eq(players.id, id));
    return true;
  }

  // Tournaments
  async getTournament(id: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments);
  }

  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const [newTournament] = await db.insert(tournaments).values(tournament).returning();
    return newTournament!;
  }

  async updateTournament(id: string, tournamentUpdate: Partial<InsertTournament>): Promise<Tournament | undefined> {
    const [tournament] = await db.update(tournaments)
      .set(tournamentUpdate)
      .where(eq(tournaments.id, id))
      .returning();
    return tournament;
  }

  async deleteTournament(id: string): Promise<boolean> {
    const result = await db.delete(tournaments).where(eq(tournaments.id, id));
    return true;
  }

  // Tournament Registrations
  async registerPlayerToTournament(playerId: string, tournamentId: string): Promise<TournamentRegistration> {
    const [registration] = await db.insert(tournamentRegistrations)
      .values({ playerId, tournamentId })
      .returning();
    return registration!;
  }

  async getPlayersForTournament(tournamentId: string): Promise<Player[]> {
    const result = await db
      .select({ player: players })
      .from(tournamentRegistrations)
      .innerJoin(players, eq(tournamentRegistrations.playerId, players.id))
      .where(eq(tournamentRegistrations.tournamentId, tournamentId));
    
    return result.map((r: { player: Player }) => r.player);
  }

  async getTournamentsForPlayer(playerId: string): Promise<Tournament[]> {
    const result = await db
      .select({ tournament: tournaments })
      .from(tournamentRegistrations)
      .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
      .where(eq(tournamentRegistrations.playerId, playerId));
    
    return result.map((r: { tournament: Tournament }) => r.tournament);
  }

  // Teams
  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam!;
  }

  async deleteTeam(id: string): Promise<boolean> {
    await db.delete(teams).where(eq(teams.id, id));
    return true;
  }

  async getTeamsForTournament(tournamentId: string): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.tournamentId, tournamentId));
  }

  async getTeamByCaptain(captainId: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.captainId, captainId));
    return team;
  }

  // Draft
  async draftPlayer(teamId: string, playerId: string): Promise<TeamPlayer> {
    const [teamPlayer] = await db.insert(teamPlayers)
      .values({ teamId, playerId })
      .returning();
    return teamPlayer!;
  }

  async getPlayersForTeam(teamId: string): Promise<Player[]> {
    const result = await db
      .select({ player: players })
      .from(teamPlayers)
      .innerJoin(players, eq(teamPlayers.playerId, players.id))
      .where(eq(teamPlayers.teamId, teamId));
    
    return result.map((r: { player: Player }) => r.player);
  }

  async getDraftedPlayerIds(tournamentId: string): Promise<string[]> {
    const tournamentTeams = await this.getTeamsForTournament(tournamentId);
    const teamIds = tournamentTeams.map(t => t.id);
    
    if (teamIds.length === 0) return [];
    
    const result = await db
      .select({ playerId: teamPlayers.playerId })
      .from(teamPlayers)
      .where(sql`${teamPlayers.teamId} IN (${sql.join(teamIds.map(id => sql`${id}`), sql`, `)})`);
    
    return result.map(r => r.playerId);
  }
}

export const storage = new DatabaseStorage();
