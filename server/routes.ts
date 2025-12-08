import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlayerSchema, insertTournamentSchema, type Player } from "@shared/schema";

declare module 'express-session' {
  interface SessionData {
    playerId?: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============ AUTH ROUTES ============
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ error: "Se requiere identificador y contraseña" });
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
      const player = await storage.getPlayerByMobile(identifier);
      if (!player) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      // If captain, check password
      if (player.role === "captain" || player.role === "admin") {
        if (player.password === password) {
          req.session.playerId = player.id;
          return res.json({ player });
        } else {
          return res.status(401).json({ error: "Credenciales inválidas" });
        }
      }

      return res.status(401).json({ error: "Credenciales inválidas" });
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
      // Don't send passwords to client
      const safePlayers = players.map(p => {
        const { password, ...safe } = p;
        return safe;
      });
      res.json({ players: safePlayers });
    } catch (error) {
      console.error("Get players error:", error);
      res.status(500).json({ error: "Error al obtener jugadores" });
    }
  });

  // Register player
  app.post("/api/players/register", async (req, res) => {
    try {
      const validatedData = insertPlayerSchema.parse(req.body);
      const newPlayer = await storage.createPlayer(validatedData);
      
      // If tournament ID is provided, register to that tournament
      if (req.body.tournamentId) {
        await storage.registerPlayerToTournament(newPlayer.id, req.body.tournamentId);
      }

      const { password, ...safePlayer } = newPlayer;
      res.json({ player: safePlayer });
    } catch (error: any) {
      console.error("Register error:", error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: "Este móvil ya está registrado" });
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

  // ============ TOURNAMENT ROUTES ============
  
  // Get all tournaments
  app.get("/api/tournaments", async (req, res) => {
    try {
      const tournaments = await storage.getAllTournaments();
      res.json({ tournaments });
    } catch (error) {
      console.error("Get tournaments error:", error);
      res.status(500).json({ error: "Error al obtener torneos" });
    }
  });

  // Get tournament by ID with registered players
  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: "Torneo no encontrado" });
      }

      const registeredPlayers = await storage.getPlayersForTournament(req.params.id);
      const safePlayers = registeredPlayers.map(p => {
        const { password, ...safe } = p;
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
      const validatedData = insertTournamentSchema.parse(req.body);
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
      const tournament = await storage.updateTournament(req.params.id, req.body);
      if (!tournament) {
        return res.status(404).json({ error: "Torneo no encontrado" });
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
    try {
      const { playerId } = req.body;
      if (!playerId) {
        return res.status(400).json({ error: "Se requiere ID de jugador" });
      }

      await storage.registerPlayerToTournament(playerId, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Register to tournament error:", error);
      if (error.code === '23505') {
        return res.status(409).json({ error: "Ya estás inscrito en este torneo" });
      }
      res.status(500).json({ error: "Error al inscribirse al torneo" });
    }
  });

  // ============ DRAFT ROUTES ============
  
  // Draft a player to a team (Captain/Admin only)
  app.post("/api/draft", async (req, res) => {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const currentPlayer = await storage.getPlayer(req.session.playerId);
    if (!currentPlayer || (currentPlayer.role !== 'captain' && currentPlayer.role !== 'admin')) {
      return res.status(403).json({ error: "Solo capitanes pueden draftear jugadores" });
    }

    try {
      const { teamId, playerId } = req.body;
      if (!teamId || !playerId) {
        return res.status(400).json({ error: "Se requiere teamId y playerId" });
      }

      const teamPlayer = await storage.draftPlayer(teamId, playerId);
      res.json({ teamPlayer });
    } catch (error) {
      console.error("Draft error:", error);
      res.status(500).json({ error: "Error al draftear jugador" });
    }
  });

  return httpServer;
}
