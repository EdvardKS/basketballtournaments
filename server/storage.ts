import { 
  type Player, type InsertPlayer,
  type Tournament, type InsertTournament,
  type TournamentRegistration, type InsertTournamentRegistration,
  type Team, type InsertTeam,
  type TeamPlayer, type InsertTeamPlayer,
  type DraftState, type InsertDraftState,
  type DraftHistory, type InsertDraftHistory,
  type TradeOffer, type InsertTradeOffer,
  type TournamentGroup, type InsertTournamentGroup,
  type GroupMember, type InsertGroupMember,
  type Match, type InsertMatch,
  type PlayerSkillSnapshot, type InsertPlayerSkillSnapshot,
  players, tournaments, tournamentRegistrations, teams, teamPlayers, draftState, draftHistory, tradeOffers,
  tournamentGroups, groupMembers, matches, playerSkillSnapshots
} from "@shared/schema";
import { db } from "./db";
import { type SQL, eq, and, or, sql, desc, inArray, isNull, ne } from "drizzle-orm";

export interface IStorage {
  // Players
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByMobile(mobile: string): Promise<Player | undefined>;
  getPlayerByUsername(username: string): Promise<Player | undefined>;
  getPlayerByEmail(email: string): Promise<Player | undefined>;
  getPlayerByIdentifier(identifier: string): Promise<Player | undefined>;
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
  getAvailablePlayersForTournament(tournamentId: string, query?: string): Promise<Player[]>;
  getTournamentsForPlayer(playerId: string): Promise<Tournament[]>;
  
  // Teams
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  deleteTeam(id: string): Promise<boolean>;
  getTeamsForTournament(tournamentId: string): Promise<Team[]>;
  getTeamByCaptain(captainId: string): Promise<Team | undefined>;
  getTeamByCaptainForTournament(captainId: string, tournamentId: string): Promise<Team | undefined>;
  updateTeamInfo(teamId: string, update: Partial<InsertTeam>): Promise<Team | undefined>;
  getTeamsWithPlayers(tournamentId: string): Promise<{ team: Team; players: Player[] }[]>;
  getPlayerTeamInTournament(playerId: string, tournamentId: string): Promise<Team | undefined>;
  setPlayerTeamInTournament(playerId: string, tournamentId: string, teamId: string): Promise<void>;
  
  // Draft
  draftPlayer(teamId: string, playerId: string): Promise<TeamPlayer>;
  getPlayersForTeam(teamId: string): Promise<Player[]>;
  getDraftedPlayerIds(tournamentId: string): Promise<string[]>;
  
  // Draft State
  getDraftState(tournamentId: string): Promise<DraftState | undefined>;
  createDraftState(state: InsertDraftState): Promise<DraftState>;
  updateDraftState(tournamentId: string, update: Partial<InsertDraftState>): Promise<DraftState | undefined>;
  deleteDraftState(tournamentId: string): Promise<boolean>;
  
  // Draft History
  addDraftHistory(history: InsertDraftHistory): Promise<DraftHistory>;
  getDraftHistory(tournamentId: string): Promise<DraftHistory[]>;

  // Trades
  getTradeOffer(id: string): Promise<TradeOffer | undefined>;
  getTradeOffersForTournament(tournamentId: string): Promise<TradeOffer[]>;
  createTradeOffer(offer: InsertTradeOffer): Promise<TradeOffer>;
  updateTradeOffer(id: string, update: Partial<InsertTradeOffer>): Promise<TradeOffer | undefined>;
  countTradeOffersForPlayer(tournamentId: string, playerId: string): Promise<number>;
  
  // Per-Tournament Captain Management
  setTournamentCaptain(playerId: string, tournamentId: string, isCaptain: boolean, teamName?: string): Promise<TournamentRegistration | undefined>;
  getTournamentRegistration(playerId: string, tournamentId: string): Promise<TournamentRegistration | undefined>;
  getCaptainsForTournament(tournamentId: string): Promise<(TournamentRegistration & { player: Player })[]>;
  getRegistrationsForTournament(tournamentId: string): Promise<(TournamentRegistration & { player: Player })[]>;
  isPlayerCaptainInAnyTournament(playerId: string): Promise<boolean>;
  
  // Groups
  createGroup(group: InsertTournamentGroup): Promise<TournamentGroup>;
  getGroupsForTournament(tournamentId: string): Promise<TournamentGroup[]>;
  addTeamToGroup(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: string): Promise<(GroupMember & { team: Team })[]>;
  updateGroupMemberStats(groupMemberId: string, stats: Partial<InsertGroupMember>): Promise<GroupMember | undefined>;
  
  // Matches
  createMatch(match: InsertMatch): Promise<Match>;
  getMatch(id: string): Promise<Match | undefined>;
  getMatchesForTournament(tournamentId: string): Promise<Match[]>;
  getMatchesForGroup(groupId: string): Promise<Match[]>;
  startMatch(matchId: string, durationMinutes: number): Promise<Match | undefined>;
  updateMatchScore(matchId: string, homeScore: number, awayScore: number): Promise<Match | undefined>;
  finalizeMatch(matchId: string, homeScore: number, awayScore: number, winnerId: string | null): Promise<Match | undefined>;
  
  // Player Skill Snapshots
  createSkillSnapshot(snapshot: InsertPlayerSkillSnapshot): Promise<PlayerSkillSnapshot>;
  getSkillSnapshotsForPlayer(playerId: string): Promise<PlayerSkillSnapshot[]>;
  getSkillSnapshotsForTournament(tournamentId: string): Promise<PlayerSkillSnapshot[]>;
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

  async getPlayerByUsername(username: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.username, username));
    return player;
  }

  async getPlayerByEmail(email: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.email, email));
    return player;
  }

  async getPlayerByIdentifier(identifier: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players)
      .where(or(
        eq(players.mobile, identifier),
        eq(players.username, identifier),
        eq(players.email, identifier)
      ));
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

  async getAvailablePlayersForTournament(tournamentId: string, query?: string): Promise<Player[]> {
    const conditions: SQL<unknown>[] = [
      isNull(tournamentRegistrations.id),
      ne(players.role, 'admin'),
    ];

    if (query) {
      const pattern = `%${query}%`;
      const searchCondition = or(
        sql`${players.name} ILIKE ${pattern}`,
        sql`${players.username} ILIKE ${pattern}`,
        sql`${players.email} ILIKE ${pattern}`,
        sql`${players.mobile} ILIKE ${pattern}`,
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const result = await db
      .select({ player: players })
      .from(players)
      .leftJoin(
        tournamentRegistrations,
        and(
          eq(tournamentRegistrations.playerId, players.id),
          eq(tournamentRegistrations.tournamentId, tournamentId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(players.overall), desc(players.createdAt));

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
    const [newTeam] = await db.insert(teams).values({
      ...team,
      nameConfirmed: team.nameConfirmed ?? false,
    }).returning();
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

  async getTeamByCaptainForTournament(captainId: string, tournamentId: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams)
      .where(and(
        eq(teams.captainId, captainId),
        eq(teams.tournamentId, tournamentId)
      ));
    return team;
  }

  async updateTeamInfo(teamId: string, update: Partial<InsertTeam>): Promise<Team | undefined> {
    const [team] = await db.update(teams)
      .set(update)
      .where(eq(teams.id, teamId))
      .returning();
    return team;
  }

  async getTeamsWithPlayers(tournamentId: string): Promise<{ team: Team; players: Player[] }[]> {
    const rows = await db.select({
      team: teams,
      player: players,
    })
      .from(teams)
      .leftJoin(teamPlayers, eq(teamPlayers.teamId, teams.id))
      .leftJoin(players, eq(players.id, teamPlayers.playerId))
      .where(eq(teams.tournamentId, tournamentId));

    const map = new Map<string, { team: Team; players: Player[] }>();
    rows.forEach((row) => {
      const entry = map.get(row.team.id) || { team: row.team, players: [] };
      if (row.player) {
        entry.players.push(row.player);
      }
      map.set(row.team.id, entry);
    });

    return Array.from(map.values()).map((entry) => ({
      team: entry.team,
      players: [...entry.players].sort((a, b) => (b.overall || 0) - (a.overall || 0)),
    }));
  }

  async getPlayerTeamInTournament(playerId: string, tournamentId: string): Promise<Team | undefined> {
    const [row] = await db.select({
      team: teams,
    })
      .from(teamPlayers)
      .innerJoin(teams, eq(teamPlayers.teamId, teams.id))
      .where(and(
        eq(teamPlayers.playerId, playerId),
        eq(teams.tournamentId, tournamentId)
      ));
    return row?.team;
  }

  async setPlayerTeamInTournament(playerId: string, tournamentId: string, teamId: string): Promise<void> {
    const rows = await db.select({
      id: teamPlayers.id,
      teamId: teamPlayers.teamId,
    })
      .from(teamPlayers)
      .innerJoin(teams, eq(teamPlayers.teamId, teams.id))
      .where(and(
        eq(teamPlayers.playerId, playerId),
        eq(teams.tournamentId, tournamentId)
      ));

    const alreadyOnTeam = rows.some((row) => row.teamId === teamId);
    const toDelete = rows.filter((row) => row.teamId !== teamId).map((row) => row.id);

    if (toDelete.length > 0) {
      await db.delete(teamPlayers).where(inArray(teamPlayers.id, toDelete));
    }

    if (!alreadyOnTeam) {
      await db.insert(teamPlayers).values({ teamId, playerId });
    }
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

  // Draft State
  async getDraftState(tournamentId: string): Promise<DraftState | undefined> {
    const [state] = await db.select().from(draftState).where(eq(draftState.tournamentId, tournamentId));
    return state;
  }

  async createDraftState(state: InsertDraftState): Promise<DraftState> {
    const [newState] = await db.insert(draftState).values(state).returning();
    return newState!;
  }

  async updateDraftState(tournamentId: string, update: Partial<InsertDraftState>): Promise<DraftState | undefined> {
    const [state] = await db.update(draftState)
      .set(update)
      .where(eq(draftState.tournamentId, tournamentId))
      .returning();
    return state;
  }

  async deleteDraftState(tournamentId: string): Promise<boolean> {
    await db.delete(draftState).where(eq(draftState.tournamentId, tournamentId));
    return true;
  }

  // Draft History
  async addDraftHistory(history: InsertDraftHistory): Promise<DraftHistory> {
    const [newHistory] = await db.insert(draftHistory).values(history).returning();
    return newHistory!;
  }

  async getDraftHistory(tournamentId: string): Promise<DraftHistory[]> {
    return await db.select().from(draftHistory)
      .where(eq(draftHistory.tournamentId, tournamentId))
      .orderBy(desc(draftHistory.pickedAt));
  }

  // Trades
  async getTradeOffer(id: string): Promise<TradeOffer | undefined> {
    const [offer] = await db.select().from(tradeOffers).where(eq(tradeOffers.id, id));
    return offer;
  }

  async getTradeOffersForTournament(tournamentId: string): Promise<TradeOffer[]> {
    return await db.select().from(tradeOffers)
      .where(eq(tradeOffers.tournamentId, tournamentId))
      .orderBy(desc(tradeOffers.createdAt));
  }

  async createTradeOffer(offer: InsertTradeOffer): Promise<TradeOffer> {
    const [newOffer] = await db.insert(tradeOffers).values(offer).returning();
    return newOffer!;
  }

  async updateTradeOffer(id: string, update: Partial<InsertTradeOffer>): Promise<TradeOffer | undefined> {
    const [offer] = await db.update(tradeOffers)
      .set(update)
      .where(eq(tradeOffers.id, id))
      .returning();
    return offer;
  }

  async countTradeOffersForPlayer(tournamentId: string, playerId: string): Promise<number> {
    const [row] = await db.select({
      count: sql<number>`count(*)`,
    })
      .from(tradeOffers)
      .where(and(
        eq(tradeOffers.tournamentId, tournamentId),
        eq(tradeOffers.targetPlayerId, playerId)
      ));
    return Number(row?.count || 0);
  }

  // Per-Tournament Captain Management
  async setTournamentCaptain(playerId: string, tournamentId: string, isCaptain: boolean, teamName?: string): Promise<TournamentRegistration | undefined> {
    const [registration] = await db.update(tournamentRegistrations)
      .set({ isCaptain, teamName: teamName || null })
      .where(and(
        eq(tournamentRegistrations.playerId, playerId),
        eq(tournamentRegistrations.tournamentId, tournamentId)
      ))
      .returning();
    return registration;
  }

  async getTournamentRegistration(playerId: string, tournamentId: string): Promise<TournamentRegistration | undefined> {
    const [registration] = await db.select().from(tournamentRegistrations)
      .where(and(
        eq(tournamentRegistrations.playerId, playerId),
        eq(tournamentRegistrations.tournamentId, tournamentId)
      ));
    return registration;
  }

  async getCaptainsForTournament(tournamentId: string): Promise<(TournamentRegistration & { player: Player })[]> {
    const result = await db
      .select({
        id: tournamentRegistrations.id,
        playerId: tournamentRegistrations.playerId,
        tournamentId: tournamentRegistrations.tournamentId,
        isCaptain: tournamentRegistrations.isCaptain,
        teamName: tournamentRegistrations.teamName,
        registeredAt: tournamentRegistrations.registeredAt,
        player: players
      })
      .from(tournamentRegistrations)
      .innerJoin(players, eq(tournamentRegistrations.playerId, players.id))
      .where(and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.isCaptain, true)
      ));
    
    return result.map(r => ({
      id: r.id,
      playerId: r.playerId,
      tournamentId: r.tournamentId,
      isCaptain: r.isCaptain,
      teamName: r.teamName,
      registeredAt: r.registeredAt,
      player: r.player
    }));
  }

  async getRegistrationsForTournament(tournamentId: string): Promise<(TournamentRegistration & { player: Player })[]> {
    const result = await db
      .select({
        id: tournamentRegistrations.id,
        playerId: tournamentRegistrations.playerId,
        tournamentId: tournamentRegistrations.tournamentId,
        isCaptain: tournamentRegistrations.isCaptain,
        teamName: tournamentRegistrations.teamName,
        registeredAt: tournamentRegistrations.registeredAt,
        player: players
      })
      .from(tournamentRegistrations)
      .innerJoin(players, eq(tournamentRegistrations.playerId, players.id))
      .where(eq(tournamentRegistrations.tournamentId, tournamentId));
    
    return result.map(r => ({
      id: r.id,
      playerId: r.playerId,
      tournamentId: r.tournamentId,
      isCaptain: r.isCaptain,
      teamName: r.teamName,
      registeredAt: r.registeredAt,
      player: r.player
    }));
  }

  async isPlayerCaptainInAnyTournament(playerId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tournamentRegistrations)
      .where(and(
        eq(tournamentRegistrations.playerId, playerId),
        eq(tournamentRegistrations.isCaptain, true)
      ));
    return Number(result?.count ?? 0) > 0;
  }

  // Groups
  async createGroup(group: InsertTournamentGroup): Promise<TournamentGroup> {
    const [newGroup] = await db.insert(tournamentGroups).values(group).returning();
    return newGroup!;
  }

  async getGroupsForTournament(tournamentId: string): Promise<TournamentGroup[]> {
    return await db.select().from(tournamentGroups)
      .where(eq(tournamentGroups.tournamentId, tournamentId));
  }

  async addTeamToGroup(member: InsertGroupMember): Promise<GroupMember> {
    const [newMember] = await db.insert(groupMembers).values(member).returning();
    return newMember!;
  }

  async getGroupMembers(groupId: string): Promise<(GroupMember & { team: Team })[]> {
    const result = await db
      .select({
        id: groupMembers.id,
        groupId: groupMembers.groupId,
        teamId: groupMembers.teamId,
        points: groupMembers.points,
        gamesPlayed: groupMembers.gamesPlayed,
        gamesWon: groupMembers.gamesWon,
        gamesLost: groupMembers.gamesLost,
        pointsFor: groupMembers.pointsFor,
        pointsAgainst: groupMembers.pointsAgainst,
        team: teams
      })
      .from(groupMembers)
      .innerJoin(teams, eq(groupMembers.teamId, teams.id))
      .where(eq(groupMembers.groupId, groupId));
    
    return result.map(r => ({
      id: r.id,
      groupId: r.groupId,
      teamId: r.teamId,
      points: r.points,
      gamesPlayed: r.gamesPlayed,
      gamesWon: r.gamesWon,
      gamesLost: r.gamesLost,
      pointsFor: r.pointsFor,
      pointsAgainst: r.pointsAgainst,
      team: r.team
    }));
  }

  async updateGroupMemberStats(groupMemberId: string, stats: Partial<InsertGroupMember>): Promise<GroupMember | undefined> {
    const [member] = await db.update(groupMembers)
      .set(stats)
      .where(eq(groupMembers.id, groupMemberId))
      .returning();
    return member;
  }

  // Matches
  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch!;
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches)
      .where(eq(matches.id, id));
    return match;
  }

  async getMatchesForTournament(tournamentId: string): Promise<Match[]> {
    return await db.select().from(matches)
      .where(eq(matches.tournamentId, tournamentId));
  }

  async getMatchesForGroup(groupId: string): Promise<Match[]> {
    return await db.select().from(matches)
      .where(eq(matches.groupId, groupId));
  }

  async startMatch(matchId: string, durationMinutes: number): Promise<Match | undefined> {
    const [match] = await db.update(matches)
      .set({ 
        status: 'in_progress',
        startedAt: new Date(),
        durationMinutes,
        homeScore: 0,
        awayScore: 0,
      })
      .where(eq(matches.id, matchId))
      .returning();
    return match;
  }

  async updateMatchScore(matchId: string, homeScore: number, awayScore: number): Promise<Match | undefined> {
    const [match] = await db.update(matches)
      .set({ 
        homeScore, 
        awayScore,
        status: 'in_progress'
      })
      .where(eq(matches.id, matchId))
      .returning();
    return match;
  }

  async finalizeMatch(matchId: string, homeScore: number, awayScore: number, winnerId: string | null): Promise<Match | undefined> {
    const [match] = await db.update(matches)
      .set({ 
        homeScore, 
        awayScore, 
        winnerId, 
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(matches.id, matchId))
      .returning();
    return match;
  }

  // Player Skill Snapshots
  async createSkillSnapshot(snapshot: InsertPlayerSkillSnapshot): Promise<PlayerSkillSnapshot> {
    const [newSnapshot] = await db.insert(playerSkillSnapshots).values(snapshot).returning();
    return newSnapshot!;
  }

  async getSkillSnapshotsForPlayer(playerId: string): Promise<PlayerSkillSnapshot[]> {
    return await db.select().from(playerSkillSnapshots)
      .where(eq(playerSkillSnapshots.playerId, playerId))
      .orderBy(desc(playerSkillSnapshots.snapshotAt));
  }

  async getSkillSnapshotsForTournament(tournamentId: string): Promise<PlayerSkillSnapshot[]> {
    return await db.select().from(playerSkillSnapshots)
      .where(eq(playerSkillSnapshots.tournamentId, tournamentId));
  }
}

export const storage = new DatabaseStorage();
