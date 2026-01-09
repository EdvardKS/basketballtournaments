import { storage } from "./storage";
import type { InsertPlayer, InsertTournament } from "@shared/schema";

function calculateOverall(pace: number, shooting: number, passing: number, dribbling: number, defense: number, physical: number) {
  return Math.round((pace + shooting + passing + dribbling + defense + physical) / 6);
}

async function seed() {
  console.log("🌱 Seeding database con datos de ejemplo...");

  // Admin
  const admin: InsertPlayer = {
    name: "Eduard Administrador",
    mobile: "edvardks",
    role: "admin",
    password: "SX515wifi",
    pace: 75, shooting: 80, passing: 85, dribbling: 78, defense: 70, physical: 82,
    overall: 78,
    avatar: null,
  };

  // Capitanes (6)
  const captains: InsertPlayer[] = [
    { name: "Carlos 'El Capitán' Martínez", mobile: "600100001", role: "captain", password: "capitan1", pace: 85, shooting: 88, passing: 82, dribbling: 80, defense: 70, physical: 85, overall: 0, avatar: null },
    { name: "Miguel Ángel López", mobile: "600100002", role: "captain", password: "capitan2", pace: 78, shooting: 75, passing: 90, dribbling: 85, defense: 72, physical: 80, overall: 0, avatar: null },
    { name: "Adrián 'El Muro' García", mobile: "600100003", role: "captain", password: "capitan3", pace: 72, shooting: 70, passing: 78, dribbling: 68, defense: 92, physical: 90, overall: 0, avatar: null },
    { name: "Pablo Sánchez Ruiz", mobile: "600100004", role: "captain", password: "capitan4", pace: 80, shooting: 92, passing: 75, dribbling: 78, defense: 65, physical: 82, overall: 0, avatar: null },
    { name: "Roberto 'Flash' Vega", mobile: "600100005", role: "captain", password: "capitan5", pace: 95, shooting: 72, passing: 70, dribbling: 88, defense: 55, physical: 78, overall: 0, avatar: null },
    { name: "Fernando Torres Díaz", mobile: "600100006", role: "captain", password: "capitan6", pace: 82, shooting: 85, passing: 88, dribbling: 80, defense: 75, physical: 80, overall: 0, avatar: null },
  ];

  // Jugadores (20)
  const players: InsertPlayer[] = [
    { name: "Javier 'Jet' Fernández", mobile: "600200001", role: "player", password: null, pace: 94, shooting: 70, passing: 65, dribbling: 78, defense: 55, physical: 75, overall: 0, avatar: null },
    { name: "Daniel Ruiz", mobile: "600200002", role: "player", password: null, pace: 72, shooting: 88, passing: 80, dribbling: 75, defense: 60, physical: 70, overall: 0, avatar: null },
    { name: "Sergio 'El Mago' Torres", mobile: "600200003", role: "player", password: null, pace: 68, shooting: 65, passing: 92, dribbling: 90, defense: 58, physical: 62, overall: 0, avatar: null },
    { name: "Luis 'La Roca' Ramírez", mobile: "600200004", role: "player", password: null, pace: 62, shooting: 55, passing: 68, dribbling: 60, defense: 95, physical: 94, overall: 0, avatar: null },
    { name: "Antonio Moreno", mobile: "600200005", role: "player", password: null, pace: 88, shooting: 82, passing: 75, dribbling: 88, defense: 62, physical: 78, overall: 0, avatar: null },
    { name: "Pedro Jiménez", mobile: "600200006", role: "player", password: null, pace: 75, shooting: 78, passing: 72, dribbling: 70, defense: 75, physical: 82, overall: 0, avatar: null },
    { name: "Raúl 'El Artillero' Díaz", mobile: "600200007", role: "player", password: null, pace: 70, shooting: 95, passing: 72, dribbling: 68, defense: 50, physical: 75, overall: 0, avatar: null },
    { name: "Iván Castro", mobile: "600200008", role: "player", password: null, pace: 85, shooting: 72, passing: 68, dribbling: 85, defense: 58, physical: 80, overall: 0, avatar: null },
    { name: "Álvaro Ortiz", mobile: "600200009", role: "player", password: null, pace: 78, shooting: 80, passing: 85, dribbling: 78, defense: 72, physical: 75, overall: 0, avatar: null },
    { name: "Diego 'Turbo' Herrera", mobile: "600200010", role: "player", password: null, pace: 96, shooting: 65, passing: 60, dribbling: 80, defense: 45, physical: 82, overall: 0, avatar: null },
    { name: "Marcos Delgado", mobile: "600200011", role: "player", password: null, pace: 68, shooting: 70, passing: 78, dribbling: 65, defense: 88, physical: 90, overall: 0, avatar: null },
    { name: "Alejandro 'Nene' Núñez", mobile: "600200012", role: "player", password: null, pace: 75, shooting: 70, passing: 92, dribbling: 88, defense: 60, physical: 65, overall: 0, avatar: null },
    { name: "Víctor 'Tank' Molina", mobile: "600200013", role: "player", password: null, pace: 65, shooting: 72, passing: 68, dribbling: 62, defense: 85, physical: 96, overall: 0, avatar: null },
    { name: "Hugo Blanco", mobile: "600200014", role: "player", password: null, pace: 82, shooting: 78, passing: 80, dribbling: 82, defense: 70, physical: 78, overall: 0, avatar: null },
    { name: "Óscar 'El Sniper' Reyes", mobile: "600200015", role: "player", password: null, pace: 72, shooting: 94, passing: 75, dribbling: 70, defense: 55, physical: 72, overall: 0, avatar: null },
    { name: "Nicolás Fuentes", mobile: "600200016", role: "player", password: null, pace: 80, shooting: 75, passing: 78, dribbling: 80, defense: 72, physical: 78, overall: 0, avatar: null },
    { name: "Cristian 'El Pulpo' Luna", mobile: "600200017", role: "player", password: null, pace: 70, shooting: 65, passing: 70, dribbling: 72, defense: 90, physical: 85, overall: 0, avatar: null },
    { name: "Samuel Ríos", mobile: "600200018", role: "player", password: null, pace: 88, shooting: 80, passing: 75, dribbling: 85, defense: 60, physical: 75, overall: 0, avatar: null },
    { name: "Adrián 'Sombra' Pardo", mobile: "600200019", role: "player", password: null, pace: 90, shooting: 72, passing: 70, dribbling: 92, defense: 52, physical: 70, overall: 0, avatar: null },
    { name: "Gonzalo Medina", mobile: "600200020", role: "player", password: null, pace: 75, shooting: 82, passing: 80, dribbling: 78, defense: 75, physical: 80, overall: 0, avatar: null },
  ];

  // Torneos
  const tournaments: InsertTournament[] = [
    // Finalizados
    { name: "Copa Villena 2024", date: "2024-06-15", status: "completed", location: "Polideportivo Municipal", description: "Gran final histórica. Campeón: Los Titanes", maxTeams: 8 },
    { name: "Liga Invierno 2024", date: "2024-02-20", status: "completed", location: "Pabellón La Losilla", description: "Liga invernal completada con 12 equipos", maxTeams: 12 },
    { name: "Torneo Navidad 2024", date: "2024-12-22", status: "completed", location: "Polideportivo Municipal", description: "Torneo navideño especial", maxTeams: 4 },
    { name: "3x3 Street Cup", date: "2024-08-10", status: "completed", location: "Plaza Mayor Villena", description: "Torneo callejero 3x3 completado", maxTeams: 16 },
    
    // Activos (en curso)
    { name: "Liga Primavera 2025", date: "2025-01-10", status: "active", location: "Pabellón La Losilla", description: "Liga de primavera - Jornada 4 de 10", maxTeams: 8 },
    { name: "Copa Reyes 2025", date: "2025-01-06", status: "active", location: "Polideportivo Municipal", description: "Semifinales en curso", maxTeams: 4 },
    
    // En draft
    { name: "Torneo San Valentín", date: "2025-02-14", status: "draft", location: "Polideportivo Municipal", description: "Selección de equipos en proceso", maxTeams: 6 },
    { name: "Copa Carnaval 2025", date: "2025-02-28", status: "draft", location: "Pabellón La Losilla", description: "Draft de jugadores activo", maxTeams: 8 },
    
    // Abiertos (inscripciones)
    { name: "Copa Fallas 2025", date: "2025-03-19", status: "open", location: "Polideportivo Municipal", description: "¡Inscripciones abiertas! Torneo especial de Fallas", maxTeams: 8 },
    { name: "Liga Verano 2025", date: "2025-06-21", status: "open", location: "Polideportivo Municipal", description: "La liga más esperada del año. ¡Apúntate ya!", maxTeams: 10 },
    { name: "Torneo Moros y Cristianos", date: "2025-09-05", status: "open", location: "Plaza de Toros", description: "Torneo especial de fiestas patronales", maxTeams: 8 },
    { name: "3x3 Summer Jam", date: "2025-07-15", status: "open", location: "Plaza Mayor", description: "Torneo callejero 3x3 veraniego", maxTeams: 16 },
  ];

  // Insertar admin
  try {
    await storage.createPlayer(admin);
    console.log("✅ Admin creado: edvardks / SX515wifi");
  } catch (e) {
    console.log("⚠️  Admin ya existe");
  }

  // Insertar capitanes
  for (const cap of captains) {
    cap.overall = calculateOverall(cap.pace!, cap.shooting!, cap.passing!, cap.dribbling!, cap.defense!, cap.physical!);
    try {
      await storage.createPlayer(cap);
      console.log(`✅ Capitán: ${cap.name} (${cap.mobile} / ${cap.password})`);
    } catch (e) {
      console.log(`⚠️  Capitán ${cap.name} ya existe`);
    }
  }

  // Insertar jugadores
  for (const p of players) {
    p.overall = calculateOverall(p.pace!, p.shooting!, p.passing!, p.dribbling!, p.defense!, p.physical!);
    try {
      await storage.createPlayer(p);
      console.log(`✅ Jugador: ${p.name}`);
    } catch (e) {
      console.log(`⚠️  Jugador ${p.name} ya existe`);
    }
  }

  // Insertar torneos
  const createdTournaments: any[] = [];
  for (const t of tournaments) {
    try {
      const created = await storage.createTournament(t);
      createdTournaments.push(created);
      console.log(`✅ Torneo: ${t.name} (${t.status})`);
    } catch (e) {
      console.log(`⚠️  Torneo ${t.name} ya existe`);
    }
  }

  // Registrar jugadores en torneos abiertos
  const allPlayers = await storage.getAllPlayers();
  const openTournaments = createdTournaments.filter(t => t.status === 'open');
  const eligiblePlayers = allPlayers.filter(p => p.role !== 'admin');

  for (const tournament of openTournaments) {
    const numToRegister = Math.min(eligiblePlayers.length, 8 + Math.floor(Math.random() * 5));
    const shuffled = [...eligiblePlayers].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < numToRegister; i++) {
      try {
        await storage.registerPlayerToTournament(shuffled[i].id, tournament.id);
      } catch (e) {}
    }
    console.log(`📝 ${numToRegister} jugadores registrados en ${tournament.name}`);
  }

  console.log("\n🎉 Seed completado!");
  console.log("\n📋 CREDENCIALES DE ACCESO:");
  console.log("═══════════════════════════════════════");
  console.log("ADMIN:    edvardks / SX515wifi");
  console.log("───────────────────────────────────────");
  console.log("CAPITÁN 1: 600100001 / capitan1");
  console.log("CAPITÁN 2: 600100002 / capitan2");
  console.log("CAPITÁN 3: 600100003 / capitan3");
  console.log("CAPITÁN 4: 600100004 / capitan4");
  console.log("CAPITÁN 5: 600100005 / capitan5");
  console.log("CAPITÁN 6: 600100006 / capitan6");
  console.log("═══════════════════════════════════════");

  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
