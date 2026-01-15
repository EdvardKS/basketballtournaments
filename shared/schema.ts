import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Players Table
export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  username: text("username"),
  email: text("email"),
  role: text("role").notNull().default('player'), // 'player' | 'captain' | 'admin'
  position: text("position").notNull().default('base'), // 'base' | 'alero-base' | 'escolta' | 'alero' | 'ala-pivot' | 'pivot'
  password: text("password"), // Only for captains and admin
  avatar: text("avatar"), // Base64 or URL
  isPublic: boolean("is_public").notNull().default(false),
  
  // Stats
  pace: integer("pace").notNull().default(50),
  shooting: integer("shooting").notNull().default(50),
  passing: integer("passing").notNull().default(50),
  dribbling: integer("dribbling").notNull().default(50),
  defense: integer("defense").notNull().default(50),
  physical: integer("physical").notNull().default(50),
  overall: integer("overall").notNull().default(50),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
});

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

// Tournaments Table
export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default('open'), // 'open' | 'draft' | 'setup' | 'scheduled' | 'active' | 'completed'
  location: text("location").notNull(),
  description: text("description").notNull(),
  rules: text("rules"),
  maxTeams: integer("max_teams").notNull().default(8),
  winnerId: varchar("winner_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
});

export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;

// Tournament Registrations (Many-to-Many relationship between players and tournaments)
// isCaptain is per-tournament (a player can be captain in one tournament but not another)
export const tournamentRegistrations = pgTable("tournament_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: 'cascade' }),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  isCaptain: boolean("is_captain").notNull().default(false),
  teamName: text("team_name"), // Name of the team if this player is captain
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

export const insertTournamentRegistrationSchema = createInsertSchema(tournamentRegistrations).omit({
  id: true,
  registeredAt: true,
});

export type InsertTournamentRegistration = z.infer<typeof insertTournamentRegistrationSchema>;
export type TournamentRegistration = typeof tournamentRegistrations.$inferSelect;

// Teams Table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  captainId: varchar("captain_id").notNull().references(() => players.id),
  name: text("name").notNull(),
  nameConfirmed: boolean("name_confirmed").notNull().default(false),
  whatsappGroupName: text("whatsapp_group_name"),
  whatsappGroupLink: text("whatsapp_group_link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Team Players (Many-to-Many relationship between teams and players)
export const teamPlayers = pgTable("team_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  playerId: varchar("player_id").notNull().references(() => players.id),
  draftedAt: timestamp("drafted_at").notNull().defaultNow(),
});

export const insertTeamPlayerSchema = createInsertSchema(teamPlayers).omit({
  id: true,
  draftedAt: true,
});

export type InsertTeamPlayer = z.infer<typeof insertTeamPlayerSchema>;
export type TeamPlayer = typeof teamPlayers.$inferSelect;

// Draft State Table - Controls turn-based drafting
export const draftState = pgTable("draft_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  teamOrder: text("team_order").notNull(), // JSON array of team IDs in draft order
  currentTeamIndex: integer("current_team_index").notNull().default(0),
  currentRound: integer("current_round").notNull().default(1),
  maxRounds: integer("max_rounds").notNull().default(5),
  isActive: text("is_active").notNull().default('true'), // 'true' | 'false'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDraftStateSchema = createInsertSchema(draftState).omit({
  id: true,
  createdAt: true,
});

export type InsertDraftState = z.infer<typeof insertDraftStateSchema>;
export type DraftState = typeof draftState.$inferSelect;

// Draft History - Log of all picks for admin monitoring
export const draftHistory = pgTable("draft_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  playerId: varchar("player_id").notNull().references(() => players.id),
  round: integer("round").notNull(),
  pickOrder: integer("pick_order").notNull(),
  pickedAt: timestamp("picked_at").notNull().defaultNow(),
});

export const insertDraftHistorySchema = createInsertSchema(draftHistory).omit({
  id: true,
  pickedAt: true,
});

export type InsertDraftHistory = z.infer<typeof insertDraftHistorySchema>;
export type DraftHistory = typeof draftHistory.$inferSelect;

// Trade Offers - Captain trade requests and outcomes
export const tradeOffers = pgTable("trade_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  requestingTeamId: varchar("requesting_team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  targetTeamId: varchar("target_team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  targetPlayerId: varchar("target_player_id").notNull().references(() => players.id),
  offeredPlayerIds: text("offered_player_ids").notNull(), // JSON array of player IDs
  status: text("status").notNull().default('pending'), // 'pending' | 'accepted' | 'rejected' | 'cancelled'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => players.id),
});

export const insertTradeOfferSchema = createInsertSchema(tradeOffers).omit({
  id: true,
  createdAt: true,
});

export type InsertTradeOffer = z.infer<typeof insertTradeOfferSchema>;
export type TradeOffer = typeof tradeOffers.$inferSelect;

// Tournament Groups (for group stage)
export const tournamentGroups = pgTable("tournament_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // e.g., "Grupo A", "Grupo B"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTournamentGroupSchema = createInsertSchema(tournamentGroups).omit({
  id: true,
  createdAt: true,
});

export type InsertTournamentGroup = z.infer<typeof insertTournamentGroupSchema>;
export type TournamentGroup = typeof tournamentGroups.$inferSelect;

// Group Members (teams in each group)
export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => tournamentGroups.id, { onDelete: 'cascade' }),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  points: integer("points").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  gamesWon: integer("games_won").notNull().default(0),
  gamesLost: integer("games_lost").notNull().default(0),
  pointsFor: integer("points_for").notNull().default(0),
  pointsAgainst: integer("points_against").notNull().default(0),
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
});

export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;

// Matches (group stage and knockouts)
export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  groupId: varchar("group_id").references(() => tournamentGroups.id, { onDelete: 'cascade' }), // null for knockout matches
  stage: text("stage").notNull(), // 'group' | 'quarterfinal' | 'semifinal' | 'final' | 'third_place'
  roundNumber: integer("round_number"), // For knockout bracket positioning
  homeTeamId: varchar("home_team_id").references(() => teams.id),
  awayTeamId: varchar("away_team_id").references(() => teams.id),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  winnerId: varchar("winner_id").references(() => teams.id),
  status: text("status").notNull().default('pending'), // 'pending' | 'in_progress' | 'completed'
  durationMinutes: integer("duration_minutes"),
  startedAt: timestamp("started_at"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
});

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

// Player Skill Snapshots (for historical tracking and growth analytics)
export const playerSkillSnapshots = pgTable("player_skill_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: 'cascade' }),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  pace: integer("pace").notNull(),
  shooting: integer("shooting").notNull(),
  passing: integer("passing").notNull(),
  dribbling: integer("dribbling").notNull(),
  defense: integer("defense").notNull(),
  physical: integer("physical").notNull(),
  overall: integer("overall").notNull(),
  snapshotAt: timestamp("snapshot_at").notNull().defaultNow(),
});

export const insertPlayerSkillSnapshotSchema = createInsertSchema(playerSkillSnapshots).omit({
  id: true,
  snapshotAt: true,
});

export type InsertPlayerSkillSnapshot = z.infer<typeof insertPlayerSkillSnapshotSchema>;
export type PlayerSkillSnapshot = typeof playerSkillSnapshots.$inferSelect;
