// Match schedule generator: assigns time slots respecting court config.
// Times not revealed until admin calls confirmSchedule (hours_confirmed=true).
import { query, queryOne } from "../db/query.js";
import { HttpError } from "../middleware/error.js";

const DEFAULT_START_HOUR = 9; // 09:00 AM
const BUFFER_MINUTES = 5;

export const generateSchedule = async (tournamentId: string) => {
  const tRow = await queryOne(
    "SELECT match_date, court_count, half_court, game_duration_minutes FROM tournaments WHERE id=$1",
    [tournamentId],
  );
  if (!tRow) throw new HttpError(404, "TOURNAMENT_NOT_FOUND");

  const t = tRow as {
    match_date: string | null;
    court_count: number;
    half_court: boolean;
    game_duration_minutes: number;
  };

  if (!t.match_date) throw new HttpError(400, "NO_MATCH_DATE");

  const slotDuration = Number(t.game_duration_minutes) + BUFFER_MINUTES;
  // Number of simultaneous games: half_court means 2 per time slot
  const concurrent = t.half_court ? 2 : 1;
  const baseDate = new Date(t.match_date + "T00:00:00Z");
  baseDate.setUTCHours(DEFAULT_START_HOUR, 0, 0, 0);

  // Fetch all pending group matches, ordered by group then pair
  const matches = await query(
    `SELECT m.id, m.group_id FROM matches m
     WHERE m.tournament_id=$1 AND m.stage='group' AND m.status='pending'
     ORDER BY m.group_id, m.created_at`, [tournamentId],
  );

  if (matches.length === 0) return;

  let slotIndex = 0;
  let slotCount = 0; // how many matches assigned to current slot

  for (const match of matches) {
    const slotMs = slotIndex * slotDuration * 60 * 1000;
    const scheduledAt = new Date(baseDate.getTime() + slotMs).toISOString();
    await queryOne(
      "UPDATE matches SET scheduled_at=$2 WHERE id=$1",
      [(match as { id: string }).id, scheduledAt],
    );
    slotCount++;
    if (slotCount >= concurrent) {
      slotIndex++;
      slotCount = 0;
    }
  }
};

export const confirmSchedule = async (tournamentId: string) => {
  await queryOne(
    "UPDATE tournaments SET hours_confirmed=true WHERE id=$1", [tournamentId],
  );
  return { ok: true };
};

export const updateMatchTime = async (matchId: string, scheduledAt: string) => {
  const row = await queryOne(
    "UPDATE matches SET scheduled_at=$2 WHERE id=$1 RETURNING id, scheduled_at",
    [matchId, scheduledAt],
  );
  if (!row) throw new HttpError(404, "MATCH_NOT_FOUND");
  return row;
};
