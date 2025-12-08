import { storage } from "./storage";
import type { InsertPlayer, InsertTournament } from "@shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create Admin
  const admin: InsertPlayer = {
    name: "Comisionado de la Liga",
    mobile: "edvardks",
    role: "admin",
    password: "SX515wifi",
    pace: 99,
    shooting: 99,
    passing: 99,
    dribbling: 99,
    defense: 99,
    physical: 99,
    overall: 99,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60",
  };

  try {
    await storage.createPlayer(admin);
    console.log("✅ Admin created");
  } catch (e) {
    console.log("⚠️  Admin already exists");
  }

  // Create sample captains
  const captain1: InsertPlayer = {
    name: "Alex 'El Deslizador' Rivera",
    mobile: "666111222",
    role: "captain",
    password: "captain123",
    pace: 88,
    shooting: 82,
    passing: 75,
    dribbling: 85,
    defense: 60,
    physical: 70,
    overall: 77,
    avatar: "https://images.unsplash.com/photo-1546519638-68e109498ee3?w=400&auto=format&fit=crop&q=60",
  };

  try {
    await storage.createPlayer(captain1);
    console.log("✅ Sample captain created");
  } catch (e) {
    console.log("⚠️  Sample captain already exists");
  }

  // Create sample players
  const samplePlayers: InsertPlayer[] = [
    {
      name: "Marcos 'La Torre' Johnson",
      mobile: "666222333",
      role: "player",
      pace: 60,
      shooting: 70,
      passing: 65,
      dribbling: 55,
      defense: 90,
      physical: 92,
      overall: 72,
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=60",
    },
    {
      name: "Sara 'Francotiradora' Chen",
      mobile: "666333444",
      role: "player",
      pace: 85,
      shooting: 94,
      passing: 78,
      dribbling: 80,
      defense: 45,
      physical: 50,
      overall: 72,
      avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&auto=format&fit=crop&q=60",
    },
    {
      name: "David 'Handles' Kim",
      mobile: "666444555",
      role: "player",
      pace: 90,
      shooting: 75,
      passing: 88,
      dribbling: 92,
      defense: 55,
      physical: 60,
      overall: 77,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=60",
    },
  ];

  for (const player of samplePlayers) {
    try {
      await storage.createPlayer(player);
      console.log(`✅ ${player.name} created`);
    } catch (e) {
      console.log(`⚠️  ${player.name} already exists`);
    }
  }

  // Create sample tournaments
  const tournament1: InsertTournament = {
    name: "Clásico Callejero Villena 2024",
    date: "2024-07-15",
    status: "open",
    location: "Pistas Polideportivo Villena",
    description: "El torneo legendario regresa a Villena. 5v5 cancha completa. El ganador se lo lleva todo.",
    maxTeams: 8,
  };

  const tournament2: InsertTournament = {
    name: "Liga de Invierno Indoor",
    date: "2024-12-01",
    status: "open",
    location: "Pabellón Cubierto Municipal",
    description: "Liga pro-am indoor. Regístrate ahora.",
    maxTeams: 12,
  };

  try {
    const t1 = await storage.createTournament(tournament1);
    console.log("✅ Tournament 1 created");
    
    // Register some players to tournament 1
    const allPlayers = await storage.getAllPlayers();
    for (let i = 0; i < Math.min(3, allPlayers.length); i++) {
      if (allPlayers[i].role !== 'admin') {
        await storage.registerPlayerToTournament(allPlayers[i].id, t1.id);
      }
    }
    console.log("✅ Players registered to tournament 1");
  } catch (e) {
    console.log("⚠️  Tournament 1 already exists");
  }

  try {
    await storage.createTournament(tournament2);
    console.log("✅ Tournament 2 created");
  } catch (e) {
    console.log("⚠️  Tournament 2 already exists");
  }

  console.log("✅ Seeding complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
