import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Players Table
export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  role: text("role").notNull().default('player'), // 'player' | 'captain' | 'admin'
  password: text("password"), // Only for captains and admin
  avatar: text("avatar"), // Base64 or URL
  
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
  status: text("status").notNull().default('open'), // 'open' | 'draft' | 'active' | 'completed'
  location: text("location").notNull(),
  description: text("description").notNull(),
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
export const tournamentRegistrations = pgTable("tournament_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: 'cascade' }),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
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
