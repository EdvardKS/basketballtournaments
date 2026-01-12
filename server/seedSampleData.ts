import { db } from "./db";
import { players, tournaments, tournamentRegistrations, teams, teamPlayers } from "@shared/schema";
import { eq } from "drizzle-orm";

const samplePlayers = [
  { name: "Carlos Martínez", mobile: "600111001", pace: 78, shooting: 82, passing: 75, dribbling: 80, defense: 65, physical: 72 },
  { name: "Miguel Ángel López", mobile: "600111002", pace: 85, shooting: 70, passing: 68, dribbling: 75, defense: 72, physical: 80 },
  { name: "Javier Fernández", mobile: "600111003", pace: 70, shooting: 88, passing: 72, dribbling: 68, defense: 60, physical: 68 },
  { name: "Pablo García", mobile: "600111004", pace: 75, shooting: 75, passing: 85, dribbling: 82, defense: 68, physical: 70 },
  { name: "Adrián Sánchez", mobile: "600111005", pace: 65, shooting: 60, passing: 70, dribbling: 65, defense: 88, physical: 85 },
  { name: "David Ruiz", mobile: "600111006", pace: 80, shooting: 78, passing: 70, dribbling: 78, defense: 70, physical: 75 },
  { name: "Alejandro Torres", mobile: "600111007", pace: 72, shooting: 85, passing: 78, dribbling: 72, defense: 62, physical: 68 },
  { name: "Sergio Navarro", mobile: "600111008", pace: 88, shooting: 68, passing: 65, dribbling: 85, defense: 65, physical: 70 },
  { name: "Daniel Moreno", mobile: "600111009", pace: 68, shooting: 72, passing: 80, dribbling: 70, defense: 82, physical: 80 },
  { name: "Alberto Jiménez", mobile: "600111010", pace: 75, shooting: 80, passing: 75, dribbling: 75, defense: 75, physical: 75 },
  { name: "Raúl Castillo", mobile: "600111011", pace: 82, shooting: 75, passing: 72, dribbling: 80, defense: 68, physical: 72 },
  { name: "Víctor Romero", mobile: "600111012", pace: 70, shooting: 82, passing: 80, dribbling: 75, defense: 65, physical: 70 },
  { name: "Iván Molina", mobile: "600111013", pace: 78, shooting: 70, passing: 72, dribbling: 70, defense: 80, physical: 82 },
  { name: "Hugo Delgado", mobile: "600111014", pace: 85, shooting: 72, passing: 68, dribbling: 82, defense: 62, physical: 68 },
  { name: "Óscar Herrera", mobile: "600111015", pace: 68, shooting: 78, passing: 82, dribbling: 72, defense: 72, physical: 75 },
  { name: "Roberto Fuentes", mobile: "600111016", pace: 72, shooting: 75, passing: 78, dribbling: 78, defense: 78, physical: 78 },
];

const captainPlayers = [
  { name: "Antonio Pérez", mobile: "600222001", pace: 75, shooting: 80, passing: 82, dribbling: 78, defense: 70, physical: 75, role: "captain" as const, password: "capitan1" },
  { name: "Francisco Gómez", mobile: "600222002", pace: 80, shooting: 75, passing: 78, dribbling: 82, defense: 72, physical: 78, role: "captain" as const, password: "capitan2" },
  { name: "Manuel Díaz", mobile: "600222003", pace: 72, shooting: 82, passing: 80, dribbling: 75, defense: 75, physical: 72, role: "captain" as const, password: "capitan3" },
  { name: "José Hernández", mobile: "600222004", pace: 78, shooting: 78, passing: 75, dribbling: 80, defense: 68, physical: 80, role: "captain" as const, password: "capitan4" },
];

function calculateOverall(stats: { pace: number; shooting: number; passing: number; dribbling: number; defense: number; physical: number }): number {
  return Math.round((stats.pace + stats.shooting + stats.passing + stats.dribbling + stats.defense + stats.physical) / 6);
}

export async function seedSampleData() {
  try {
    const existingTournament = await db.select().from(tournaments).where(eq(tournaments.name, "Torneo Navidad 2025"));
    if (existingTournament.length > 0) {
      console.log("Sample data already exists");
      return { success: true, message: "Datos de ejemplo ya existen" };
    }

    const [sampleTournament] = await db.insert(tournaments).values({
      name: "Torneo Navidad 2025",
      date: "2025-12-20",
      location: "Pabellon Municipal Villena",
      description: "Gran torneo navideño con los mejores jugadores de la comarca. Formato eliminatoria directa.",
      status: "completed",
      maxTeams: 4,
    }).returning();

    const createdCaptains = [];
    for (const captain of captainPlayers) {
      const [created] = await db.insert(players).values({
        name: captain.name,
        mobile: captain.mobile,
        role: captain.role,
        password: captain.password,
        pace: captain.pace,
        shooting: captain.shooting,
        passing: captain.passing,
        dribbling: captain.dribbling,
        defense: captain.defense,
        physical: captain.physical,
        overall: calculateOverall(captain),
      }).returning();
      createdCaptains.push(created);
    }

    const createdPlayers = [];
    for (const player of samplePlayers) {
      const [created] = await db.insert(players).values({
        name: player.name,
        mobile: player.mobile,
        role: "player",
        pace: player.pace,
        shooting: player.shooting,
        passing: player.passing,
        dribbling: player.dribbling,
        defense: player.defense,
        physical: player.physical,
        overall: calculateOverall(player),
      }).returning();
      createdPlayers.push(created);
    }

    for (const captain of createdCaptains) {
      await db.insert(tournamentRegistrations).values({
        playerId: captain.id,
        tournamentId: sampleTournament.id,
      });
    }
    for (const player of createdPlayers) {
      await db.insert(tournamentRegistrations).values({
        playerId: player.id,
        tournamentId: sampleTournament.id,
      });
    }

    const teamNames = ["Los Halcones", "Dragones Rojos", "Thunder Villena", "Águilas Doradas"];
    const createdTeams = [];
    for (let i = 0; i < 4; i++) {
      const [team] = await db.insert(teams).values({
        tournamentId: sampleTournament.id,
        captainId: createdCaptains[i].id,
        name: teamNames[i],
      }).returning();
      createdTeams.push(team);
    }

    for (let i = 0; i < createdPlayers.length; i++) {
      const teamIndex = i % 4;
      await db.insert(teamPlayers).values({
        teamId: createdTeams[teamIndex].id,
        playerId: createdPlayers[i].id,
      });
    }

    console.log("Sample data seeded successfully");
    return { success: true, message: "Datos de ejemplo creados correctamente" };
  } catch (error) {
    console.error("Error seeding sample data:", error);
    return { success: false, error: String(error) };
  }
}
