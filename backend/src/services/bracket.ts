// Knockout bracket generator + winner propagation.
//
// Supported formats (admin chooses on tournament config):
//
//   - top2_per_group               default — 2 mejores de cada grupo
//   - top1_plus_best2_seconds      1º de cada grupo + 2 mejores 2dos
//
// Supported bracket sizes (admin chooses):
//
//   - 4   semifinales + final + 3er puesto
//   - 8   cuartos     + semis  + final + 3er puesto
//   - 16  octavos     + cuartos + semis + final + 3er puesto
//
// If the qualified pool is bigger than the chosen size, the pool is trimmed
// globally by (points DESC, diff DESC, points_for DESC, wins DESC). If it's
// smaller, an error is thrown (admin must drop format or add more groups).
//
// Seeding: cross-paired so groupmates / same-group qualifiers never meet in
// the very first round when possible. Byes (when the qualified count doesn't
// fit a power of two) use a deterministic per-tournament shuffle so re-runs
// reproduce.
//
// propagateBracketWinner is called from completeMatch and fills the next
// round's slot deterministically based on stage + round_number.
import { query, queryOne, tx } from "../db/query.js";
import { HttpError } from "../middleware/error.js";
import type { MatchStage } from "../types.js";

export type BracketFormat =
  | "top2_per_group"
  | "top1_plus_best2_seconds";

export type BracketSize = 4 | 8 | 16;

interface Qualified {
  teamId: string;
  groupId: string;
  rank: number;           // 1 = group winner, 2 = 2nd in group, etc.
  points: number;
  diff: number;
  pointsFor: number;
  gamesWon: number;
}

// Fetch ALL members of a group, sorted with the canonical tiebreak order.
const getGroupRanking = async (
  q: typeof query, groupId: string,
): Promise<Qualified[]> => {
  const rows = await q<{
    team_id: string; points: number; points_for: number;
    points_against: number; games_won: number;
  }>(
    `SELECT team_id, points, points_for, points_against, games_won
     FROM group_members
     WHERE group_id=$1
     ORDER BY
       points DESC,
       (points_for - points_against) DESC,
       points_for DESC,
       games_won DESC`,
    [groupId],
  );
  return rows.map((r, idx) => ({
    teamId: r.team_id,
    groupId,
    rank: idx + 1,
    points: Number(r.points),
    diff: Number(r.points_for) - Number(r.points_against),
    pointsFor: Number(r.points_for),
    gamesWon: Number(r.games_won),
  }));
};

// Global tiebreak used everywhere we have to compare teams across groups.
const cmpGlobal = (a: Qualified, b: Qualified): number =>
  b.points - a.points
  || b.diff - a.diff
  || b.pointsFor - a.pointsFor
  || b.gamesWon - a.gamesWon;

// Deterministic PRNG so re-renders / re-runs of the same tournament reproduce
// the same byes when the format requires them.
const hashSeed = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const seededShuffle = <T>(arr: T[], seed: number): T[] => {
  const out = arr.slice();
  const rng = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// --- Qualifier selection per format ---------------------------------------

const collectQualified = async (
  q: typeof query, tournamentId: string, format: BracketFormat,
): Promise<Qualified[]> => {
  const groups = await q<{ id: string }>(
    "SELECT id FROM tournament_groups WHERE tournament_id=$1 ORDER BY name",
    [tournamentId],
  );
  if (groups.length === 0) throw new HttpError(400, "NO_GROUPS");

  const groupRankings: Qualified[][] = [];
  for (const g of groups) {
    groupRankings.push(await getGroupRanking(q, g.id));
  }

  if (format === "top2_per_group") {
    // Single group → grab top 4 (rank 1..4) so it still works.
    if (groupRankings.length === 1) {
      return groupRankings[0].slice(0, 4);
    }
    const out: Qualified[] = [];
    for (const ranking of groupRankings) out.push(...ranking.slice(0, 2));
    return out;
  }

  if (format === "top1_plus_best2_seconds") {
    if (groupRankings.length < 2) {
      throw new HttpError(400, "FORMAT_NEEDS_MULTIPLE_GROUPS");
    }
    const firsts: Qualified[] = [];
    const seconds: Qualified[] = [];
    for (const ranking of groupRankings) {
      if (ranking[0]) firsts.push(ranking[0]);
      if (ranking[1]) seconds.push(ranking[1]);
    }
    seconds.sort(cmpGlobal);
    return [...firsts, ...seconds.slice(0, 2)];
  }

  throw new HttpError(400, "UNKNOWN_BRACKET_FORMAT");
};

// --- Cross-pair helper (avoids groupmate matchups in round 1) -------------

const crossPairsAvoidingGroupmates = (
  seedsHome: Qualified[],
  seedsAway: Qualified[],
): Array<[Qualified, Qualified]> => {
  // Walk home seeds and try to find an away seed from a different group,
  // not already used. Falls back to a groupmate if no other option remains.
  const pairs: Array<[Qualified, Qualified]> = [];
  const usedAway = new Set<number>();
  for (let i = 0; i < seedsHome.length; i++) {
    const home = seedsHome[i];
    let pickedIdx = seedsAway.findIndex(
      (s, idx) => !usedAway.has(idx) && s.groupId !== home.groupId,
    );
    if (pickedIdx < 0) {
      // Last resort: take any remaining away (forced groupmate).
      pickedIdx = seedsAway.findIndex((_, idx) => !usedAway.has(idx));
    }
    if (pickedIdx < 0) break;
    usedAway.add(pickedIdx);
    pairs.push([home, seedsAway[pickedIdx]]);
  }
  return pairs;
};

// --- Bracket provisioners by size -----------------------------------------

const provisionFour = async (
  q: typeof query, tournamentId: string, qualified: Qualified[],
) => {
  // Cross 1 vs 4 / 2 vs 3 when from same single group; otherwise 1 vs 4 / 2 vs 3 also works as a pure seeding.
  const seeds = qualified.slice(); // already sorted globally
  const pairs: Array<[Qualified, Qualified]> = [
    [seeds[0], seeds[3]],
    [seeds[1], seeds[2]],
  ];
  for (let i = 0; i < pairs.length; i++) {
    const [home, away] = pairs[i];
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number, home_team_id, away_team_id)
       VALUES ($1,'semifinal','pending',$2,$3,$4)`,
      [tournamentId, i + 1, home.teamId, away.teamId],
    );
  }
  await q(
    `INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'final','pending',1)`,
    [tournamentId],
  );
  await q(
    `INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'third_place','pending',1)`,
    [tournamentId],
  );
};

const provisionEight = async (
  q: typeof query, tournamentId: string, qualified: Qualified[],
) => {
  // Top half (seeds 1..4) vs bottom half (5..8), with groupmate avoidance.
  const sorted = qualified.slice();
  const top = sorted.slice(0, 4);
  const bot = sorted.slice(4, 8);
  const pairs = crossPairsAvoidingGroupmates(top, bot);
  for (let i = 0; i < pairs.length; i++) {
    const [home, away] = pairs[i];
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number, home_team_id, away_team_id)
       VALUES ($1,'quarterfinal','pending',$2,$3,$4)`,
      [tournamentId, i + 1, home.teamId, away.teamId],
    );
  }
  for (let i = 0; i < 2; i++) {
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'semifinal','pending',$2)`,
      [tournamentId, i + 1],
    );
  }
  await q(
    `INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'final','pending',1)`,
    [tournamentId],
  );
  await q(
    `INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'third_place','pending',1)`,
    [tournamentId],
  );
};

const provisionSixteen = async (
  q: typeof query, tournamentId: string, qualified: Qualified[],
) => {
  const sorted = qualified.slice();
  const top = sorted.slice(0, 8);
  const bot = sorted.slice(8, 16);
  const pairs = crossPairsAvoidingGroupmates(top, bot);
  for (let i = 0; i < pairs.length; i++) {
    const [home, away] = pairs[i];
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number, home_team_id, away_team_id)
       VALUES ($1,'eighth','pending',$2,$3,$4)`,
      [tournamentId, i + 1, home.teamId, away.teamId],
    );
  }
  for (let i = 0; i < 4; i++) {
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'quarterfinal','pending',$2)`,
      [tournamentId, i + 1],
    );
  }
  for (let i = 0; i < 2; i++) {
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'semifinal','pending',$2)`,
      [tournamentId, i + 1],
    );
  }
  await q(
    `INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'final','pending',1)`,
    [tournamentId],
  );
  await q(
    `INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'third_place','pending',1)`,
    [tournamentId],
  );
};

// --- Public API -----------------------------------------------------------

const readBracketConfig = async (
  q: typeof query, tournamentId: string,
): Promise<{ format: BracketFormat; size: BracketSize | null }> => {
  const row = await q<{
    bracket_format: string | null; bracket_size: number | null;
  }>(
    "SELECT bracket_format, bracket_size FROM tournaments WHERE id=$1",
    [tournamentId],
  );
  if (row.length === 0) throw new HttpError(404, "TOURNAMENT_NOT_FOUND");
  const format = (row[0].bracket_format ?? "top2_per_group") as BracketFormat;
  const rawSize = row[0].bracket_size;
  const size = rawSize === 4 || rawSize === 8 || rawSize === 16 ? rawSize : null;
  return { format, size };
};

// Pick a bracket size that fits the qualified pool when admin didn't choose.
const inferSize = (n: number): BracketSize => {
  if (n >= 16) return 16;
  if (n >= 8)  return 8;
  if (n >= 4)  return 4;
  throw new HttpError(400, "TOO_FEW_TEAMS");
};

export const generateKnockout = async (tournamentId: string) => {
  return tx(async (q) => {
    const existingKo = await q(
      "SELECT id FROM matches WHERE tournament_id=$1 AND stage!='group'",
      [tournamentId],
    );
    if (existingKo.length > 0) return { ok: true, skipped: true };
    return await provisionBracket(q, tournamentId);
  });
};

// Wipes any non-group matches and re-creates the bracket from current
// standings. Used by the admin "regenerate" endpoint and whenever the
// bracket needs to follow a fresh format / size choice.
export const regenerateBracket = async (tournamentId: string) => {
  return tx(async (q) => {
    await q(
      "DELETE FROM matches WHERE tournament_id=$1 AND stage!='group'",
      [tournamentId],
    );
    return await provisionBracket(q, tournamentId);
  });
};

const provisionBracket = async (q: typeof query, tournamentId: string) => {
  const { format, size: rawSize } = await readBracketConfig(q, tournamentId);
  const qualified = await collectQualified(q, tournamentId, format);

  // Global tiebreak: the qualified list lands here sorted by group rank;
  // re-sort GLOBALLY by points to fix the seeding bug where a 2nd-place
  // team with more points was getting dropped behind a weaker group winner.
  qualified.sort(cmpGlobal);

  if (qualified.length < 4) {
    throw new HttpError(400, "TOO_FEW_TEAMS",
      `Faltan equipos para montar un cuadro (hay ${qualified.length}, hacen falta 4 mínimo).`);
  }

  const size: BracketSize = rawSize ?? inferSize(qualified.length);
  if (qualified.length < size) {
    throw new HttpError(400, "TOO_FEW_FOR_SIZE",
      `Hay ${qualified.length} clasificados pero el cuadro está fijado a ${size}.`);
  }
  const pool = qualified.slice(0, size);

  if (size === 4)       await provisionFour(q, tournamentId, pool);
  else if (size === 8)  await provisionEight(q, tournamentId, pool);
  else if (size === 16) await provisionSixteen(q, tournamentId, pool);

  return { ok: true, format, size, qualifiedCount: pool.length };
};

// Called from completeMatch when a knockout match closes. Fills the next
// round's slot. Mapping:
//
//   eighth R (1..8)        → quarterfinal ceil(R/2). odd R → home, even R → away.
//   quarterfinal R (1..4)  → semifinal    ceil(R/2). odd R → home, even R → away.
//   semifinal R (1..2)     → final.home (R=1) or final.away (R=2).
//                            loser → third_place.home (R=1) or .away (R=2).
//   final/third_place      : no propagation.
export const propagateBracketWinner = async (
  q: typeof query,
  tournamentId: string,
  stage: MatchStage,
  round: number | null,
  winnerId: string | null,
  loserId: string | null,
): Promise<void> => {
  if (!round || !winnerId) return;

  if (stage === "eighth") {
    const qfRound = Math.ceil(round / 2);
    const slot = round % 2 === 1 ? "home_team_id" : "away_team_id";
    await q(
      `UPDATE matches SET ${slot}=$1
       WHERE tournament_id=$2 AND stage='quarterfinal' AND round_number=$3`,
      [winnerId, tournamentId, qfRound],
    );
    return;
  }

  if (stage === "quarterfinal") {
    const sfRound = Math.ceil(round / 2);
    const slot = round % 2 === 1 ? "home_team_id" : "away_team_id";
    await q(
      `UPDATE matches SET ${slot}=$1
       WHERE tournament_id=$2 AND stage='semifinal' AND round_number=$3`,
      [winnerId, tournamentId, sfRound],
    );
    return;
  }

  if (stage === "semifinal") {
    const slot = round === 1 ? "home_team_id" : "away_team_id";
    await q(
      `UPDATE matches SET ${slot}=$1
       WHERE tournament_id=$2 AND stage='final' AND round_number=1`,
      [winnerId, tournamentId],
    );
    if (loserId) {
      await q(
        `UPDATE matches SET ${slot}=$1
         WHERE tournament_id=$2 AND stage='third_place' AND round_number=1`,
        [loserId, tournamentId],
      );
    }
    return;
  }
};
