import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlayerSchema, insertTournamentSchema, type Player, type Team, type Tournament } from "@shared/schema";
import { z } from "zod";

const setCaptainSchema = z.object({
  isCaptain: z.boolean(),
  teamName: z.string().min(1).max(50).optional(),
});
const updateTeamInfoSchema = z.object({
  name: z.string().min(1).max(50),
  whatsappGroupName: z.string().min(1).max(120).optional(),
  whatsappGroupLink: z.string().min(1).max(300).optional(),
});
const startMatchSchema = z.object({
  durationMinutes: z.coerce.number().int().min(1).max(240),
});
const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});

const DEFAULT_TOURNAMENT_RULES = [
  "Formato 5v5 Cancha Completa",
  "Eliminacion Doble",
  "Dos partes de 20 minutos",
  "Seleccion por Draft de Capitanes",
  "Reglas FIBA",
].join("\n");

declare module 'express-session' {
  interface SessionData {
    playerId?: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const ensureTournamentSnapshots = async (tournamentId: string) => {
    const existing = await storage.getSkillSnapshotsForTournament(tournamentId);
    if (existing.length > 0) return;

    const players = await storage.getPlayersForTournament(tournamentId);
    if (players.length === 0) return;

    await Promise.all(players.map((player) => (
      storage.createSkillSnapshot({
        playerId: player.id,
        tournamentId,
        pace: player.pace,
        shooting: player.shooting,
        passing: player.passing,
        dribbling: player.dribbling,
        defense: player.defense,
        physical: player.physical,
        overall: player.overall,
      })
    )));
  };

  const shuffleList = <T,>(items: T[]) => {
    const list = [...items];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  const normalizeWhatsappLink = (value?: string | null) => {
    const trimmed = value ? value.trim() : "";
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const getTournamentStartDate = (dateValue: string) => {
    if (!dateValue) return null;
    const startDate = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return null;
    return startDate;
  };

  const maybeActivateTournament = async (tournament: Tournament) => {
    if (tournament.status !== 'scheduled') return tournament;
    const startDate = getTournamentStartDate(tournament.date);
    if (!startDate) return tournament;
    if (Date.now() >= startDate.getTime()) {
      const updated = await storage.updateTournament(tournament.id, { status: 'active' });
      return updated || tournament;
    }
    return tournament;
  };

  type GroupMemberSortable = {
    teamId: string;
    points: number;
    pointsFor: number;
    pointsAgainst: number;
  };

  const getSortedMembers = <T extends GroupMemberSortable>(members: T[]) => {
    return [...members].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.pointsFor - a.pointsAgainst;
      const diffB = b.pointsFor - b.pointsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return b.pointsFor - a.pointsFor;
    });
  };

  const recalculateGroupStandings = async (groupId: string) => {
    const members = await storage.getGroupMembers(groupId);
    if (members.length === 0) return;

    const statsByTeam = new Map<string, {
      points: number;
      gamesPlayed: number;
      gamesWon: number;
      gamesLost: number;
      pointsFor: number;
      pointsAgainst: number;
    }>();

    members.forEach((member) => {
      statsByTeam.set(member.teamId, {
        points: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    });

    const matches = await storage.getMatchesForGroup(groupId);
    matches.filter(match => match.status === 'completed').forEach((match) => {
      if (!match.homeTeamId || !match.awayTeamId) return;
      const home = statsByTeam.get(match.homeTeamId);
      const away = statsByTeam.get(match.awayTeamId);
      if (!home || !away) return;

      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;

      home.gamesPlayed += 1;
      away.gamesPlayed += 1;
      home.pointsFor += homeScore;
      home.pointsAgainst += awayScore;
      away.pointsFor += awayScore;
      away.pointsAgainst += homeScore;

      if (homeScore > awayScore) {
        home.gamesWon += 1;
        home.points += 2;
        away.gamesLost += 1;
      } else if (awayScore > homeScore) {
        away.gamesWon += 1;
        away.points += 2;
        home.gamesLost += 1;
      } else {
        home.points += 1;
        away.points += 1;
      }
    });

    await Promise.all(members.map((member) => {
      const stats = statsByTeam.get(member.teamId);
      if (!stats) return Promise.resolve(undefined);
      return storage.updateGroupMemberStats(member.id, stats);
    }));
  };

  const generateGroupsForTournament = async (tournamentId: string) => {
    const existingGroups = await storage.getGroupsForTournament(tournamentId);
    if (existingGroups.length > 0) {
      return existingGroups;
    }

    const teams = await storage.getTeamsForTournament(tournamentId);
    if (teams.length < 2) {
      throw new Error("No hay suficientes equipos para crear grupos");
    }

    const teamCount = teams.length;
    const groupCount = teamCount <= 4 ? 1 : teamCount <= 8 ? 2 : 4;
    const groupNames = ["Grupo A", "Grupo B", "Grupo C", "Grupo D"];
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const buckets: Team[][] = Array.from({ length: groupCount }, () => []);

    shuffledTeams.forEach((team, index) => {
      buckets[index % groupCount].push(team);
    });

    const createdGroups = [];
    for (let i = 0; i < groupCount; i += 1) {
      const group = await storage.createGroup({
        tournamentId,
        name: groupNames[i],
      });
      createdGroups.push(group);

      for (const team of buckets[i]) {
        await storage.addTeamToGroup({
          groupId: group.id,
          teamId: team.id,
          points: 0,
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          pointsFor: 0,
          pointsAgainst: 0,
        });
      }

      const groupTeamIds = buckets[i].map(team => team.id);
      for (let homeIndex = 0; homeIndex < groupTeamIds.length; homeIndex += 1) {
        for (let awayIndex = homeIndex + 1; awayIndex < groupTeamIds.length; awayIndex += 1) {
          await storage.createMatch({
            tournamentId,
            groupId: group.id,
            stage: 'group',
            roundNumber: null,
            homeTeamId: groupTeamIds[homeIndex],
            awayTeamId: groupTeamIds[awayIndex],
            status: 'pending',
          });
        }
      }
    }

    return createdGroups;
  };

  const maybeGenerateKnockout = async (tournamentId: string) => {
    const groups = await storage.getGroupsForTournament(tournamentId);
    if (groups.length === 0) return;

    const matches = await storage.getMatchesForTournament(tournamentId);
    const groupMatches = matches.filter(match => match.stage === 'group');
    if (groupMatches.length === 0) return;

    if (!groupMatches.every(match => match.status === 'completed')) return;
    if (matches.some(match => match.stage !== 'group')) return;

    await Promise.all(groups.map(group => recalculateGroupStandings(group.id)));

    const groupsWithMembers = await Promise.all(groups.map(async (group) => ({
      group,
      members: await storage.getGroupMembers(group.id),
    })));

    groupsWithMembers.sort((a, b) => a.group.name.localeCompare(b.group.name));
    const qualifiers = groupsWithMembers.map((entry) => {
      const sorted = getSortedMembers(entry.members);
      return {
        group: entry.group,
        first: sorted[0],
        second: sorted[1],
      };
    });

    if (qualifiers.length === 1) {
      const first = qualifiers[0].first?.teamId;
      const second = qualifiers[0].second?.teamId;
      if (first && second) {
        await storage.createMatch({
          tournamentId,
          groupId: null,
          stage: 'final',
          roundNumber: 1,
          homeTeamId: first,
          awayTeamId: second,
          status: 'pending',
        });
      }
      return;
    }

    if (qualifiers.length === 2) {
      const [groupA, groupB] = qualifiers;
      if (!groupA.first || !groupA.second || !groupB.first || !groupB.second) return;
      await storage.createMatch({
        tournamentId,
        groupId: null,
        stage: 'semifinal',
        roundNumber: 1,
        homeTeamId: groupA.first.teamId,
        awayTeamId: groupB.second.teamId,
        status: 'pending',
      });
      await storage.createMatch({
        tournamentId,
        groupId: null,
        stage: 'semifinal',
        roundNumber: 2,
        homeTeamId: groupB.first.teamId,
        awayTeamId: groupA.second.teamId,
        status: 'pending',
      });
      return;
    }

    if (qualifiers.length >= 4) {
      const [groupA, groupB, groupC, groupD] = qualifiers;
      if (!groupA.first || !groupA.second || !groupB.first || !groupB.second ||
          !groupC.first || !groupC.second || !groupD.first || !groupD.second) {
        return;
      }

      await storage.createMatch({
        tournamentId,
        groupId: null,
        stage: 'quarterfinal',
        roundNumber: 1,
        homeTeamId: groupA.first.teamId,
        awayTeamId: groupB.second.teamId,
        status: 'pending',
      });
      await storage.createMatch({
        tournamentId,
        groupId: null,
        stage: 'quarterfinal',
        roundNumber: 2,
        homeTeamId: groupB.first.teamId,
        awayTeamId: groupA.second.teamId,
        status: 'pending',
      });
      await storage.createMatch({
        tournamentId,
        groupId: null,
        stage: 'quarterfinal',
        roundNumber: 3,
        homeTeamId: groupC.first.teamId,
        awayTeamId: groupD.second.teamId,
        status: 'pending',
      });
      await storage.createMatch({
        tournamentId,
        groupId: null,
        stage: 'quarterfinal',
        roundNumber: 4,
        homeTeamId: groupD.first.teamId,
        awayTeamId: groupC.second.teamId,
        status: 'pending',
      });
    }
  };

  const advanceKnockoutIfReady = async (tournamentId: string) => {
    const matches = await storage.getMatchesForTournament(tournamentId);
    const quarterfinals = matches.filter(match => match.stage === 'quarterfinal');
    const semifinals = matches.filter(match => match.stage === 'semifinal');
    const finals = matches.filter(match => match.stage === 'final');
    const thirdPlace = matches.filter(match => match.stage === 'third_place');

    const byRound = (list: typeof matches) => [...list].sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0));

    if (quarterfinals.length > 0 && quarterfinals.every(match => match.status === 'completed' && match.winnerId)) {
      if (semifinals.length === 0) {
        const ordered = byRound(quarterfinals);
        const winners = ordered.map(match => match.winnerId!).filter(Boolean);
        if (winners.length >= 4) {
          await storage.createMatch({
            tournamentId,
            groupId: null,
            stage: 'semifinal',
            roundNumber: 1,
            homeTeamId: winners[0],
            awayTeamId: winners[1],
            status: 'pending',
          });
          await storage.createMatch({
            tournamentId,
            groupId: null,
            stage: 'semifinal',
            roundNumber: 2,
            homeTeamId: winners[2],
            awayTeamId: winners[3],
            status: 'pending',
          });
        }
      }
    }

    if (semifinals.length > 0 && semifinals.every(match => match.status === 'completed' && match.winnerId)) {
      if (finals.length === 0) {
        const ordered = byRound(semifinals);
        const semi1Winner = ordered[0].winnerId!;
        const semi2Winner = ordered[1]?.winnerId!;
        const semi1Loser = ordered[0].homeTeamId === semi1Winner ? ordered[0].awayTeamId : ordered[0].homeTeamId;
        const semi2Loser = ordered[1]?.homeTeamId === semi2Winner ? ordered[1].awayTeamId : ordered[1].homeTeamId;

        if (semi1Winner && semi2Winner) {
          await storage.createMatch({
            tournamentId,
            groupId: null,
            stage: 'final',
            roundNumber: 1,
            homeTeamId: semi1Winner,
            awayTeamId: semi2Winner,
            status: 'pending',
          });
        }

        if (!thirdPlace.length && semi1Loser && semi2Loser) {
          await storage.createMatch({
            tournamentId,
            groupId: null,
            stage: 'third_place',
            roundNumber: 1,
            homeTeamId: semi1Loser,
            awayTeamId: semi2Loser,
            status: 'pending',
          });
        }
      }
    }

    const completedFinal = finals.find(match => match.status === 'completed' && match.winnerId);
    if (completedFinal?.winnerId) {
      await storage.updateTournament(tournamentId, { winnerId: completedFinal.winnerId });
    }
  };
  
  // ============ AUTH ROUTES ============
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ error: "Se requiere identificador y contrasena" });
      }

      // Check if it's admin login
      if (identifier === "edvardks" && password === "SX515wifi") {
        const admin = await storage.getPlayerByMobile("edvardks");
        if (admin) {
          req.session.playerId = admin.id;
          return res.json({ player: admin });
        }
      }

      // Check captain/user login
      const player = await storage.getPlayerByIdentifier(identifier);
      if (!player) {
        return res.status(401).json({ error: "Credenciales invalidas" });
      }

      if (!player.password) {
        return res.status(401).json({ error: "Credenciales invalidas" });
      }

      if (player.password === password) {
        req.session.playerId = player.id;
        return res.json({ player });
      }

      return res.status(401).json({ error: "Credenciales invalidas" });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Error en el servidor" });
    }
  });

  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const player = await storage.getPlayer(req.session.playerId);
    if (!player) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ player });
  });

  // ============ PLAYER ROUTES ============
  
  // Get all players
  app.get("/api/players", async (req, res) => {
    try {
      const players = await storage.getAllPlayers();
      const isAuthenticated = !!req.session.playerId;

      const visiblePlayers = isAuthenticated ? players : players.filter(p => p.isPublic);
      // Don't send passwords to client, hide mobile/email for non-authenticated users
      const safePlayers = visiblePlayers.map(p => {
        const { password, ...safe } = p;
        if (!isAuthenticated) {
          return { ...safe, mobile: "***", email: undefined };
        }
        return safe;
      });
      res.json({ players: safePlayers });
    } catch (error) {
      console.error("Get players error:", error);
      res.status(500).json({ error: "Error al obtener jugadores" });
    }
  });

  // Check username availability
  app.get("/api/players/availability", async (req, res) => {
    try {
      const username = String(req.query.username || "").trim();
      if (!username) {
        return res.status(400).json({ error: "Usuario requerido" });
      }

      const existing = await storage.getPlayerByUsername(username);
      res.json({ available: !existing });
    } catch (error) {
      console.error("Username availability error:", error);
      res.status(500).json({ error: "Error al comprobar usuario" });
    }
  });

  // Register player
  app.post("/api/players/register", async (req, res) => {
    try {
      if (!req.body.avatar) {
        return res.status(400).json({ error: "La foto es obligatoria" });
      }

      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ error: "Usuario, email y contrasena son requeridos" });
      }

      const trimmedUsername = String(username).trim();
      const trimmedEmail = String(email).trim();
      if (!trimmedUsername || !trimmedEmail) {
        return res.status(400).json({ error: "Usuario y email son requeridos" });
      }

      const existingUsername = await storage.getPlayerByUsername(trimmedUsername);
      if (existingUsername) {
        return res.status(409).json({ error: "El usuario ya esta en uso" });
      }

      const existingEmail = await storage.getPlayerByEmail(trimmedEmail);
      if (existingEmail) {
        return res.status(409).json({ error: "El email ya esta en uso" });
      }

      req.body.username = trimmedUsername;
      req.body.email = trimmedEmail;
      req.body.password = String(password);
      req.body.role = 'player';
      if (req.body.isPublic === undefined) {
        req.body.isPublic = false;
      }

      const tournamentId = req.body.tournamentId;
      if (tournamentId) {
        const tournament = await storage.getTournament(tournamentId);
        if (!tournament) {
          return res.status(404).json({ error: "Torneo no encontrado" });
        }
        if (tournament.status !== 'open') {
          if (!req.session.playerId) {
            return res.status(401).json({ error: "No autenticado" });
          }
          const currentPlayer = await storage.getPlayer(req.session.playerId);
          if (!currentPlayer || currentPlayer.role !== 'admin') {
            return res.status(403).json({ error: "Solo administradores pueden inscribir jugadores en draft o torneo activo" });
          }
        }
      }
      
      const validatedData = insertPlayerSchema.parse(req.body);
      const newPlayer = await storage.createPlayer(validatedData);
      
      // If tournament ID is provided, register to that tournament
      if (req.body.tournamentId) {
        await storage.registerPlayerToTournament(newPlayer.id, req.body.tournamentId);
      }

      if (!req.session.playerId) {
        req.session.playerId = newPlayer.id;
      }

      const { password: _, ...safePlayer } = newPlayer;
      res.json({ player: safePlayer });
    } catch (error: any) {
      console.error("Register error:", error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: "Este movil ya esta registrado" });
      }
      res.status(400).json({ error: "Error al registrar jugador" });
    }
  });

  // Promote player to captain (Admin only)
  app.post("/api/players/:id/promote", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden hacer esto" });
    }

    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Se requiere contraseña" });
      }

      const updatedPlayer = await storage.promotePlayerToCaptain(req.params.id, password);
      if (!updatedPlayer) {
        return res.status(404).json({ error: "Jugador no encontrado" });
      }

      const { password: _, ...safePlayer } = updatedPlayer;
      res.json({ player: safePlayer });
    } catch (error) {
      console.error("Promote error:", error);
      res.status(500).json({ error: "Error al promover jugador" });
    }
  });

  // Get tournaments for a specific player
  app.get("/api/players/:id/tournaments", async (req, res) => {
    try {
      const tournaments = await storage.getTournamentsForPlayer(req.params.id);
      const refreshed = await Promise.all(tournaments.map(maybeActivateTournament));
      res.json({ tournaments: refreshed });
    } catch (error) {
      console.error("Get player tournaments error:", error);
      res.status(500).json({ error: "Error al obtener torneos del jugador" });
    }
  });

  // ============ TOURNAMENT ROUTES ============
  
  // Get all tournaments
  app.get("/api/tournaments", async (req, res) => {
    try {
      const tournaments = await storage.getAllTournaments();
      const refreshed = await Promise.all(tournaments.map(maybeActivateTournament));
      res.json({ tournaments: refreshed });
    } catch (error) {
      console.error("Get tournaments error:", error);
      res.status(500).json({ error: "Error al obtener torneos" });
    }
  });

  // Get tournament by ID with registered players
  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const existing = await storage.getTournament(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Torneo no encontrado" });
      }
      const tournament = await maybeActivateTournament(existing);

      const registeredPlayers = await storage.getPlayersForTournament(req.params.id);
      const isAuthenticated = !!req.session.playerId;

      const visiblePlayers = isAuthenticated ? registeredPlayers : registeredPlayers.filter(p => p.isPublic);
      const safePlayers = visiblePlayers.map(p => {
        const { password, ...safe } = p;
        if (!isAuthenticated) {
          return { ...safe, mobile: "***", email: undefined };
        }
        return safe;
      });

      res.json({ tournament, registeredPlayers: safePlayers });
    } catch (error) {
      console.error("Get tournament error:", error);
      res.status(500).json({ error: "Error al obtener torneo" });
    }
  });

  // Create tournament (Admin only)
  app.post("/api/tournaments", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden crear torneos" });
    }

    try {
      const payload = { ...req.body };
      if (!payload.rules || !String(payload.rules).trim()) {
        payload.rules = DEFAULT_TOURNAMENT_RULES;
      } else {
        payload.rules = String(payload.rules).trim();
      }

      const validatedData = insertTournamentSchema.parse(payload);
      const tournament = await storage.createTournament(validatedData);
      res.json({ tournament });
    } catch (error) {
      console.error("Create tournament error:", error);
      res.status(400).json({ error: "Error al crear torneo" });
    }
  });

  // Update tournament (Admin only)
  app.patch("/api/tournaments/:id", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden editar torneos" });
    }

    try {
      const payload = { ...req.body };
      if (payload.rules !== undefined) {
        const trimmedRules = String(payload.rules).trim();
        payload.rules = trimmedRules || DEFAULT_TOURNAMENT_RULES;
      }

      const tournament = await storage.updateTournament(req.params.id, payload);
      if (!tournament) {
        return res.status(404).json({ error: "Torneo no encontrado" });
      }
      if (req.body.status === 'completed') {
        await ensureTournamentSnapshots(tournament.id);
      }
      res.json({ tournament });
    } catch (error) {
      console.error("Update tournament error:", error);
      res.status(400).json({ error: "Error al actualizar torneo" });
    }
  });

  // Delete tournament (Admin only)
  app.delete("/api/tournaments/:id", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden eliminar torneos" });
    }

    try {
      await storage.deleteTournament(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete tournament error:", error);
      res.status(500).json({ error: "Error al eliminar torneo" });
    }
  });

  // Register player to tournament
  app.post("/api/tournaments/:id/register", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    try {
      const { playerId } = req.body;
      if (!playerId) {
        return res.status(400).json({ error: "Se requiere ID de jugador" });
      }

      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: "Torneo no encontrado" });
      }

      const currentPlayer = await storage.getPlayer(req.session.playerId);
      if (!currentPlayer) {
        return res.status(401).json({ error: "No autenticado" });
      }

      const isAdmin = currentPlayer.role === 'admin';
      if (!isAdmin && req.session.playerId !== playerId) {
        return res.status(403).json({ error: "No autorizado" });
      }

      if (tournament.status !== 'open' && !isAdmin) {
        return res.status(403).json({ error: "Inscripciones cerradas" });
      }

      await storage.registerPlayerToTournament(playerId, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Register to tournament error:", error);
      if (error.code === '23505') {
        return res.status(409).json({ error: "Ya estas inscrito en este torneo" });
      }
      res.status(500).json({ error: "Error al inscribirse al torneo" });
    }
  });

  // ============ TEAM ROUTES ============

  // Get teams for tournament
  app.get("/api/tournaments/:id/teams", async (req, res) => {
    try {
      const teams = await storage.getTeamsForTournament(req.params.id);
      res.json({ teams });
    } catch (error) {
      console.error("Get teams error:", error);
      res.status(500).json({ error: "Error al obtener equipos" });
    }
  });

  // Create team (Admin only)
  app.post("/api/teams", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden crear equipos" });
    }

    try {
      const { tournamentId, captainId, name } = req.body;
      if (!tournamentId || !captainId || !name) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
      }

      const team = await storage.createTeam({ tournamentId, captainId, name });
      res.json({ team });
    } catch (error) {
      console.error("Create team error:", error);
      res.status(500).json({ error: "Error al crear equipo" });
    }
  });

  // Delete team (Admin only)
  app.delete("/api/teams/:id", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden eliminar equipos" });
    }

    try {
      await storage.deleteTeam(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete team error:", error);
      res.status(500).json({ error: "Error al eliminar equipo" });
    }
  });


  // Update team info (Captain/Admin)
  app.patch("/api/teams/:id/name", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const parseResult = updateTeamInfoSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Datos invalidos" });
    }

    const team = await storage.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    const tournament = await storage.getTournament(team.tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Torneo no encontrado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const isAdmin = currentPlayer.role === 'admin';
    if (!isAdmin && team.captainId !== currentPlayer.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (tournament.status === 'draft') {
      return res.status(400).json({ error: "El draft sigue activo" });
    }
    if (tournament.status === 'open') {
      return res.status(400).json({ error: "No se puede configurar equipos en este estado" });
    }
    if (tournament.status === 'completed') {
      return res.status(400).json({ error: "El torneo ya esta finalizado" });
    }

    const normalizedName = parseResult.data.name.trim();
    const hasWhatsappName = Object.prototype.hasOwnProperty.call(parseResult.data, "whatsappGroupName");
    const hasWhatsappLink = Object.prototype.hasOwnProperty.call(parseResult.data, "whatsappGroupLink");
    const normalizedWhatsappName = hasWhatsappName
      ? (parseResult.data.whatsappGroupName?.trim() || null)
      : team.whatsappGroupName;
    const normalizedWhatsappLink = hasWhatsappLink
      ? normalizeWhatsappLink(parseResult.data.whatsappGroupLink)
      : team.whatsappGroupLink;

    const teams = await storage.getTeamsForTournament(team.tournamentId);
    const duplicate = teams.find(t => t.id !== team.id && t.name.toLowerCase() === normalizedName.toLowerCase());
    if (duplicate) {
      return res.status(409).json({ error: "Ya existe un equipo con ese nombre" });
    }

    const isWhatsappReady = Boolean(normalizedWhatsappName && normalizedWhatsappLink);
    const updatePayload = {
      name: normalizedName,
      nameConfirmed: isWhatsappReady,
      ...(hasWhatsappName ? { whatsappGroupName: normalizedWhatsappName } : {}),
      ...(hasWhatsappLink ? { whatsappGroupLink: normalizedWhatsappLink } : {}),
    };
    const updated = await storage.updateTeamInfo(team.id, updatePayload);

    let groupsGenerated = false;
    const refreshedTeams = await storage.getTeamsForTournament(team.tournamentId);
    const allReady = refreshedTeams.length > 0 && refreshedTeams.every(t => t.whatsappGroupName && t.whatsappGroupLink);
    let tournamentStatus = tournament.status;
    if (allReady) {
      if (tournament.status === 'setup' || tournament.status === 'draft') {
        const updatedTournament = await storage.updateTournament(team.tournamentId, { status: 'scheduled' });
        tournamentStatus = updatedTournament?.status || tournament.status;
      }
      await generateGroupsForTournament(team.tournamentId);
      groupsGenerated = true;
    }

    res.json({ team: updated, groupsGenerated, allReady, tournamentStatus });
  });

  // Get team by captain
  app.get("/api/teams/captain/:captainId", async (req, res) => {
    try {
      const tournamentId = req.query.tournamentId ? String(req.query.tournamentId) : undefined;
      const team = tournamentId
        ? await storage.getTeamByCaptainForTournament(req.params.captainId, tournamentId)
        : await storage.getTeamByCaptain(req.params.captainId);
      if (!team) {
        return res.status(404).json({ error: "Equipo no encontrado" });
      }
      const players = await storage.getPlayersForTeam(team.id);
      res.json({ team, players });
    } catch (error) {
      console.error("Get team by captain error:", error);
      res.status(500).json({ error: "Error al obtener equipo" });
    }
  });

  // ============ PLAYER MANAGEMENT ROUTES (Admin) ============

  // Update player public profile (Self/Admin)
  app.patch("/api/players/:id/public", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const isAdmin = currentPlayer.role === 'admin';
    if (!isAdmin && req.session.playerId !== req.params.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: "Valor invalido" });
    }

    try {
      const player = await storage.updatePlayer(req.params.id, { isPublic });
      if (!player) {
        return res.status(404).json({ error: "Jugador no encontrado" });
      }
      const { password, ...safePlayer } = player;
      res.json({ player: safePlayer });
    } catch (error) {
      console.error("Update public profile error:", error);
      res.status(500).json({ error: "Error al actualizar perfil" });
    }
  });


  // Update player (Admin only)
  app.patch("/api/players/:id", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden editar jugadores" });
    }

    try {
      const payload = { ...req.body };

      if (payload.username !== undefined) {
        const trimmed = String(payload.username).trim();
        if (!trimmed) {
          payload.username = null;
        } else {
          const existing = await storage.getPlayerByUsername(trimmed);
          if (existing && existing.id !== req.params.id) {
            return res.status(409).json({ error: "El usuario ya esta en uso" });
          }
          payload.username = trimmed;
        }
      }

      if (payload.email !== undefined) {
        const trimmed = String(payload.email).trim();
        if (!trimmed) {
          payload.email = null;
        } else {
          const existing = await storage.getPlayerByEmail(trimmed);
          if (existing && existing.id !== req.params.id) {
            return res.status(409).json({ error: "El email ya esta en uso" });
          }
          payload.email = trimmed;
        }
      }

      if (payload.mobile !== undefined) {
        const trimmed = String(payload.mobile).trim();
        if (!trimmed) {
          return res.status(400).json({ error: "El movil no puede estar vacio" });
        }
        const existing = await storage.getPlayerByMobile(trimmed);
        if (existing && existing.id !== req.params.id) {
          return res.status(409).json({ error: "El movil ya esta en uso" });
        }
        payload.mobile = trimmed;
      }

      if (payload.password !== undefined) {
        const trimmed = String(payload.password).trim();
        if (!trimmed) {
          delete payload.password;
        } else {
          payload.password = trimmed;
        }
      }

      if (payload.role !== undefined) {
        const validRoles = new Set(["player", "captain", "admin"]);
        if (!validRoles.has(payload.role)) {
          return res.status(400).json({ error: "Rol invalido" });
        }
      }

      const numericFields = ["pace", "shooting", "passing", "dribbling", "defense", "physical", "overall"];
      for (const field of numericFields) {
        if (payload[field] !== undefined) {
          const value = Number(payload[field]);
          if (Number.isNaN(value)) {
            return res.status(400).json({ error: "Valor invalido para estadisticas" });
          }
          payload[field] = value;
        }
      }

      const player = await storage.updatePlayer(req.params.id, payload);
      if (!player) {
        return res.status(404).json({ error: "Jugador no encontrado" });
      }
      const { password, ...safePlayer } = player;
      res.json({ player: safePlayer });
    } catch (error) {
      console.error("Update player error:", error);
      res.status(500).json({ error: "Error al actualizar jugador" });
    }
  });

  // Delete player (Admin only)
  app.delete("/api/players/:id", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden eliminar jugadores" });
    }

    try {
      await storage.deletePlayer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete player error:", error);
      res.status(500).json({ error: "Error al eliminar jugador" });
    }
  });

  // ============ DRAFT ROUTES ============
  
  // Start draft for a tournament (Admin only)
  app.post("/api/draft/start/:tournamentId", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden iniciar el draft" });
    }

    try {
      const tournamentId = req.params.tournamentId;
      const { maxRounds } = req.body;

      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: "Torneo no encontrado" });
      }

      if (tournament.status !== 'draft') {
        return res.status(400).json({ error: "El torneo debe estar en estado 'draft' para iniciar" });
      }

      const captains = await storage.getCaptainsForTournament(tournamentId);
      if (captains.length < 2) {
        return res.status(400).json({ error: "Se necesitan al menos 2 capitanes para iniciar el draft" });
      }

      const teams = [];
      for (const captain of captains) {
        let team = await storage.getTeamByCaptainForTournament(captain.playerId, tournamentId);
        if (!team) {
          const teamName = captain.teamName || `Equipo de ${captain.player.name}`;
          team = await storage.createTeam({
            tournamentId,
            captainId: captain.playerId,
            name: teamName,
          });
        }

        const teamPlayers = await storage.getPlayersForTeam(team.id);
        if (!teamPlayers.some((player) => player.id === team.captainId)) {
          await storage.draftPlayer(team.id, team.captainId);
        }

        teams.push(team);
      }

      const registrations = await storage.getRegistrationsForTournament(tournamentId);
      const captainIds = new Set(captains.map((captain) => captain.playerId));
      const draftableCount = registrations.length - captainIds.size;
      if (draftableCount <= 0) {
        await storage.updateTournament(tournamentId, { status: 'setup' });
        return res.json({ draftState: null, teams, message: "No hay jugadores para draftear. Configura WhatsApp de equipos." });
      }

      const computedRounds = Math.ceil(draftableCount / teams.length) || 1;
      const finalMaxRounds = Math.max(computedRounds, Number(maxRounds) || 0);

      const existingDraft = await storage.getDraftState(tournamentId);
      if (existingDraft && existingDraft.isActive === 'true') {
        return res.status(400).json({ error: "Ya hay un draft activo para este torneo" });
      }

      const shuffledTeamIds = shuffleList(teams.map(t => t.id));

      if (existingDraft) {
        await storage.updateDraftState(tournamentId, {
          teamOrder: JSON.stringify(shuffledTeamIds),
          currentTeamIndex: 0,
          currentRound: 1,
          maxRounds: finalMaxRounds,
          isActive: 'true',
        });
      } else {
        await storage.createDraftState({
          tournamentId,
          teamOrder: JSON.stringify(shuffledTeamIds),
          currentTeamIndex: 0,
          currentRound: 1,
          maxRounds: finalMaxRounds,
          isActive: 'true',
        });
      }

      const draftState = await storage.getDraftState(tournamentId);
      res.json({ draftState, teams });
    } catch (error) {
      console.error("Start draft error:", error);
      res.status(500).json({ error: "Error al iniciar el draft" });
    }
  });

  // Get draft state for a tournament
  app.get("/api/draft/state/:tournamentId", async (req, res) => {
    try {
      const tournamentId = req.params.tournamentId;
      const draftState = await storage.getDraftState(tournamentId);
      
      if (!draftState) {
        return res.status(404).json({ error: "No hay draft activo para este torneo" });
      }
      
      const teams = await storage.getTeamsForTournament(tournamentId);
      const teamOrder = JSON.parse(draftState.teamOrder);
      const currentTeamId = teamOrder[draftState.currentTeamIndex];
      const currentTeam = teams.find(t => t.id === currentTeamId);
      
      // Get captain info for current team
      let currentCaptain = null;
      if (currentTeam) {
        currentCaptain = await storage.getPlayer(currentTeam.captainId);
        if (currentCaptain) {
          const { password, ...safeCaptain } = currentCaptain;
          currentCaptain = safeCaptain;
        }
      }
      
      // Get draft history
      const history = await storage.getDraftHistory(tournamentId);
      
      res.json({ 
        draftState, 
        currentTeam, 
        currentCaptain,
        teams,
        history,
        teamOrder,
      });
    } catch (error) {
      console.error("Get draft state error:", error);
      res.status(500).json({ error: "Error al obtener estado del draft" });
    }
  });

  // Draft a player to a team (Captain/Admin only) - WITH TURN VALIDATION
  app.post("/api/draft", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const isAdmin = currentPlayer.role === 'admin';

    try {
      const { teamId, playerId } = req.body;
      if (!teamId || !playerId) {
        return res.status(400).json({ error: "Se requiere teamId y playerId" });
      }

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Equipo no encontrado" });
      }

      const draftState = await storage.getDraftState(team.tournamentId);
      if (!draftState || draftState.isActive !== 'true') {
        return res.status(400).json({ error: "No hay draft activo para este torneo" });
      }

      if (!isAdmin) {
        const registration = await storage.getTournamentRegistration(currentPlayer.id, team.tournamentId);
        if (!registration || !registration.isCaptain) {
          return res.status(403).json({ error: "Solo capitanes pueden draftear jugadores" });
        }

        if (team.captainId !== currentPlayer.id) {
          return res.status(403).json({ error: "No puedes draftear para un equipo que no es tuyo" });
        }

        const teamOrder = JSON.parse(draftState.teamOrder);
        const currentTeamId = teamOrder[draftState.currentTeamIndex];
        if (teamId !== currentTeamId) {
          const currentTeam = await storage.getTeam(currentTeamId);
          const captain = currentTeam ? await storage.getPlayer(currentTeam.captainId) : null;
          return res.status(403).json({ error: `No es tu turno. Es el turno de ${captain?.name || 'otro capitan'}` });
        }
      }

      const draftedIds = await storage.getDraftedPlayerIds(team.tournamentId);
      if (draftedIds.includes(playerId)) {
        return res.status(400).json({ error: "Este jugador ya ha sido drafteado" });
      }

      const registrations = await storage.getRegistrationsForTournament(team.tournamentId);
      const targetRegistration = registrations.find(r => r.playerId === playerId);
      if (!targetRegistration) {
        return res.status(400).json({ error: "Este jugador no esta inscrito en el torneo" });
      }
      if (targetRegistration.isCaptain) {
        return res.status(400).json({ error: "No se puede draftear un capitan" });
      }

      const teamPlayer = await storage.draftPlayer(teamId, playerId);

      const history = await storage.getDraftHistory(team.tournamentId);
      const pickOrder = history.length + 1;
      await storage.addDraftHistory({
        tournamentId: team.tournamentId,
        teamId,
        playerId,
        round: draftState.currentRound,
        pickOrder,
      });

      const captainIds = new Set(registrations.filter(r => r.isCaptain).map(r => r.playerId));
      const draftableCount = registrations.filter(r => !r.isCaptain).length;
      const updatedDraftedIds = await storage.getDraftedPlayerIds(team.tournamentId);
      const draftedCount = updatedDraftedIds.filter(id => !captainIds.has(id)).length;
      if (draftedCount >= draftableCount) {
        await storage.updateDraftState(team.tournamentId, { isActive: 'false' });
        await storage.updateTournament(team.tournamentId, { status: 'setup' });
        return res.json({ teamPlayer, draftComplete: true, message: "Draft completado" });
      }

      let newTeamIndex = draftState.currentTeamIndex + 1;
      let newRound = draftState.currentRound;
      let nextTeamOrder = JSON.parse(draftState.teamOrder);
      if (newTeamIndex >= nextTeamOrder.length) {
        newTeamIndex = 0;
        newRound = draftState.currentRound + 1;

        if (newRound > draftState.maxRounds) {
          await storage.updateDraftState(team.tournamentId, { isActive: 'false' });
          await storage.updateTournament(team.tournamentId, { status: 'setup' });
          return res.json({ teamPlayer, draftComplete: true, message: "Draft completado" });
        }

        const allTeams = await storage.getTeamsForTournament(team.tournamentId);
        nextTeamOrder = shuffleList(allTeams.map(t => t.id));
      }

      await storage.updateDraftState(team.tournamentId, {
        currentTeamIndex: newTeamIndex,
        currentRound: newRound,
        teamOrder: JSON.stringify(nextTeamOrder),
      });

      const updatedState = await storage.getDraftState(team.tournamentId);
      res.json({ teamPlayer, draftState: updatedState });
    } catch (error: any) {
      console.error("Draft error:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "Este jugador ya esta en un equipo" });
      }
      res.status(500).json({ error: "Error al draftear jugador" });
    }
  });

  // End draft (Admin only)
  app.post("/api/draft/end/:tournamentId", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden finalizar el draft" });
    }

    try {
      await storage.updateDraftState(req.params.tournamentId, { isActive: 'false' });
      
      // Update tournament status to active
      await storage.updateTournament(req.params.tournamentId, { status: 'setup' });
      
      res.json({ success: true, message: "Draft finalizado. Configura WhatsApp de equipos." });
    } catch (error) {
      console.error("End draft error:", error);
      res.status(500).json({ error: "Error al finalizar el draft" });
    }
  });

  // ============ PER-TOURNAMENT CAPTAIN MANAGEMENT ============

  // Get registrations with captain info for a tournament
  app.get("/api/tournaments/:id/registrations", async (req, res) => {
    try {
      const registrations = await storage.getRegistrationsForTournament(req.params.id);
      const isAuthenticated = !!req.session.playerId;

      const visibleRegistrations = isAuthenticated ? registrations : registrations.filter(r => r.player.isPublic);
      const safeRegistrations = visibleRegistrations.map(r => {
        const { password, ...safePlayer } = r.player;
        if (!isAuthenticated) {
          return {
            ...r,
            player: { ...safePlayer, mobile: "***", email: undefined }
          };
        }
        return { ...r, player: safePlayer };
      });
      
      res.json({ registrations: safeRegistrations });
    } catch (error) {
      console.error("Get registrations error:", error);
      res.status(500).json({ error: "Error al obtener inscripciones" });
    }
  });

  // Get captains for a tournament
  app.get("/api/tournaments/:id/captains", async (req, res) => {
    try {
      const captains = await storage.getCaptainsForTournament(req.params.id);
      const isAuthenticated = !!req.session.playerId;

      const visibleCaptains = isAuthenticated ? captains : captains.filter(c => c.player.isPublic);
      const safeCaptains = visibleCaptains.map(c => {
        const { password, ...safePlayer } = c.player;
        if (!isAuthenticated) {
          return {
            ...c,
            player: { ...safePlayer, mobile: "***", email: undefined }
          };
        }
        return { ...c, player: safePlayer };
      });
      
      res.json({ captains: safeCaptains });
    } catch (error) {
      console.error("Get captains error:", error);
      res.status(500).json({ error: "Error al obtener capitanes" });
    }
  });

  // Set/unset captain for a tournament (Admin only)
  app.post("/api/tournaments/:tournamentId/captains/:playerId", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden gestionar capitanes" });
    }

    try {
      // Validate request body with Zod
      const parseResult = setCaptainSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      
      const { isCaptain, teamName } = parseResult.data;
      const { tournamentId, playerId } = req.params;
      
      // Check player is registered in the tournament
      const registration = await storage.getTournamentRegistration(playerId, tournamentId);
      if (!registration) {
        return res.status(404).json({ error: "El jugador no está inscrito en este torneo" });
      }
      
      // If setting as captain with a team name, check for duplicate team names
      if (isCaptain && teamName) {
        const existingCaptains = await storage.getCaptainsForTournament(tournamentId);
        const duplicateTeam = existingCaptains.find(
          c => c.teamName?.toLowerCase() === teamName.toLowerCase() && c.player.id !== playerId
        );
        if (duplicateTeam) {
          return res.status(409).json({ error: `Ya existe un equipo con el nombre "${teamName}"` });
        }
      }
      
      // If removing captain status, explicitly clear the team name
      const finalTeamName = isCaptain ? teamName : undefined;
      
      const updated = await storage.setTournamentCaptain(playerId, tournamentId, isCaptain, finalTeamName);

      const player = await storage.getPlayer(playerId);
      if (player && player.role !== 'admin') {
        if (isCaptain) {
          const nextPassword = player.password || player.mobile;
          await storage.updatePlayer(playerId, { role: 'captain', password: nextPassword });
        } else {
          const stillCaptain = await storage.isPlayerCaptainInAnyTournament(playerId);
          if (!stillCaptain) {
            await storage.updatePlayer(playerId, { role: 'player' });
          }
        }
      }

      res.json({ registration: updated });
    } catch (error) {
      console.error("Set captain error:", error);
      res.status(500).json({ error: "Error al configurar capitán" });
    }
  });

  // ============ GROUPS AND MATCHES ============

  // Get groups for a tournament
  app.get("/api/tournaments/:id/groups", async (req, res) => {
    try {
      const groups = await storage.getGroupsForTournament(req.params.id);
      
      // Get members for each group
      const groupsWithMembers = await Promise.all(groups.map(async (group) => {
        const members = await storage.getGroupMembers(group.id);
        return { ...group, members };
      }));
      
      res.json({ groups: groupsWithMembers });
    } catch (error) {
      console.error("Get groups error:", error);
      res.status(500).json({ error: "Error al obtener grupos" });
    }
  });

  // Auto-generate groups for a tournament (Admin only)
  app.post("/api/tournaments/:id/groups/generate", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden generar grupos" });
    }

    try {
      const tournamentId = req.params.id;
      const existingGroups = await storage.getGroupsForTournament(tournamentId);
      if (existingGroups.length > 0) {
        return res.status(409).json({ error: "Los grupos ya fueron generados" });
      }

      const createdGroups = await generateGroupsForTournament(tournamentId);
      const groupsWithMembers = await Promise.all(createdGroups.map(async (group) => {
        const members = await storage.getGroupMembers(group.id);
        return { ...group, members };
      }));

      res.json({ groups: groupsWithMembers });
    } catch (error) {
      console.error("Generate groups error:", error);
      res.status(500).json({ error: "Error al generar grupos" });
    }
  });

  // Get matches for a tournament
  app.get("/api/tournaments/:id/matches", async (req, res) => {
    try {
      const matches = await storage.getMatchesForTournament(req.params.id);
      res.json({ matches });
    } catch (error) {
      console.error("Get matches error:", error);
      res.status(500).json({ error: "Error al obtener partidos" });
    }
  });

  // Start match (Admin only)
  app.post("/api/matches/:id/start", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden iniciar partidos" });
    }

    const parseResult = startMatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Datos invalidos" });
    }

    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ error: "Partido no encontrado" });
      }

      if (match.status === 'completed') {
        return res.status(400).json({ error: "El partido ya esta finalizado" });
      }

      if (match.status === 'in_progress') {
        return res.status(400).json({ error: "El partido ya esta en curso" });
      }

      const updated = await storage.startMatch(match.id, parseResult.data.durationMinutes);
      res.json({ match: updated });
    } catch (error) {
      console.error("Start match error:", error);
      res.status(500).json({ error: "Error al iniciar partido" });
    }
  });

  // Update live score (Admin only)
  app.patch("/api/matches/:id/score", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden actualizar puntuaciones" });
    }

    const parseResult = updateScoreSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Datos invalidos" });
    }

    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ error: "Partido no encontrado" });
      }

      if (match.status === 'completed') {
        return res.status(400).json({ error: "El partido ya esta finalizado" });
      }

      const updated = await storage.updateMatchScore(match.id, parseResult.data.homeScore, parseResult.data.awayScore);
      res.json({ match: updated });
    } catch (error) {
      console.error("Update score error:", error);
      res.status(500).json({ error: "Error al actualizar puntuacion" });
    }
  });

  // Update match result (Admin only)
  app.patch("/api/matches/:id/result", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores pueden actualizar resultados" });
    }

    const parseResult = updateScoreSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Datos invalidos" });
    }

    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ error: "Partido no encontrado" });
      }

      const { homeScore, awayScore } = parseResult.data;
      if (match.stage !== 'group' && homeScore === awayScore) {
        return res.status(400).json({ error: "No se permiten empates en eliminatorias" });
      }
      const winnerId = homeScore > awayScore ? match.homeTeamId : awayScore > homeScore ? match.awayTeamId : null;

      const updated = await storage.finalizeMatch(match.id, homeScore, awayScore, winnerId || null);

      if (match.groupId) {
        await recalculateGroupStandings(match.groupId);
        await maybeGenerateKnockout(match.tournamentId);
      } else {
        await advanceKnockoutIfReady(match.tournamentId);
      }

      res.json({ match: updated });
    } catch (error) {
      console.error("Update match error:", error);
      res.status(500).json({ error: "Error al actualizar resultado" });
    }
  });

  // ============ PLAYER HISTORY / ANALYTICS ============

  // Get player skill history
  app.get("/api/players/:id/history", async (req, res) => {
    try {
      const snapshots = await storage.getSkillSnapshotsForPlayer(req.params.id);
      res.json({ snapshots });
    } catch (error) {
      console.error("Get player history error:", error);
      res.status(500).json({ error: "Error al obtener historial" });
    }
  });

  // Get admin overview / analytics
  app.get("/api/admin/player-history", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || currentPlayer.role !== 'admin') {
      return res.status(403).json({ error: "Solo administradores" });
    }

    try {
      const players = (await storage.getAllPlayers()).filter(player => player.role !== 'admin');
      const tournaments = await storage.getAllTournaments();
      
      // Get total registrations per player
      const playerStats = await Promise.all(players.map(async (player) => {
        const tournamentsList = await storage.getTournamentsForPlayer(player.id);
        const snapshots = await storage.getSkillSnapshotsForPlayer(player.id);
        
        // Calculate growth if there are snapshots
        let growth = 0;
        if (snapshots.length >= 2) {
          const oldest = snapshots[snapshots.length - 1];
          const newest = snapshots[0];
          growth = newest.overall - oldest.overall;
        }
        
        const { password, ...safePlayer } = player;
        return {
          player: safePlayer,
          tournamentsPlayed: tournamentsList.length,
          tournamentIds: tournamentsList.map(t => t.id),
          snapshots,
          growth
        };
      }));
      
      // Filter by query params
      const { role, tournamentId } = req.query;
      let filtered = playerStats;
      
      if (role) {
        filtered = filtered.filter(ps => ps.player.role === role);
      }

      if (tournamentId) {
        filtered = filtered.filter(ps => ps.tournamentIds?.includes(tournamentId as string));
      }
      
      // Sort by overall rating
      filtered.sort((a, b) => b.player.overall - a.player.overall);
      
      res.json({ 
        playerStats: filtered,
        totalPlayers: players.length,
        totalTournaments: tournaments.length,
        activeTournaments: tournaments.filter(t => t.status !== 'completed').length
      });
    } catch (error) {
      console.error("Get admin analytics error:", error);
      res.status(500).json({ error: "Error al obtener estadísticas" });
    }
  });

  return httpServer;
}
