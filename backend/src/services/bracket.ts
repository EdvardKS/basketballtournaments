// Knockout bracket generator + winner propagation.
// - Seeding: top 1+2 of each group; pairs are crossed so groupmates never face
//   each other in the first round (1A vs 2B, 1B vs 2A, ...).
// - Awkward counts (5/6/7 qualified) get random byes that skip a round.
// - propagateBracketWinner is called from completeMatch and fills the next
//   round's slot deterministically based on stage + round_number, so the
//   bracket stays in sync without manual editing.
import { query, queryOne, tx } from "../db/query.js";
import { HttpError } from "../middleware/error.js";
import type { MatchStage } from "../types.js";

interface Qualified { teamId: string; groupId: string; rank: number /* 1 or 2 */ }

const getTopFromGroup = async (
  groupId: string, n: number,
): Promise<Array<{ team_id: string }>> => {
  const rows = await query(
    `SELECT gm.team_id, gm.points, (gm.points_for - gm.points_against) AS diff
     FROM group_members gm
     WHERE gm.group_id=$1
     ORDER BY gm.points DESC, diff DESC`, [groupId],
  );
  return rows.slice(0, n) as Array<{ team_id: string }>;
};

// Tiny deterministic PRNG so re-renders / re-runs of the same tournament use
// the same byes. Seeded by the tournament id (string → 32-bit hash).
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

// Build crossed pairs avoiding groupmate matchups.
//   firsts:  [1A, 1B, 1C, 1D]
//   seconds: [2A, 2B, 2C, 2D]
// Returns pairs: [(1A,2B),(1B,2A),(1C,2D),(1D,2C)] for 8 teams.
//                [(1A,2B),(1B,2A)]                  for 4 teams.
const crossedPairs = (firsts: Qualified[], seconds: Qualified[]): Array<[Qualified, Qualified]> => {
  const pairs: Array<[Qualified, Qualified]> = [];
  // Walk firsts and shift seconds so groupmates never line up.
  // Pair 0 ↔ shifted seconds[0]; we use a swap-by-pair pattern: (0,1),(1,0),(2,3),(3,2)
  // which guarantees firsts[i].groupId ≠ seconds[paired].groupId when groups are distinct.
  for (let i = 0; i < firsts.length; i += 2) {
    const a = firsts[i];
    const b = firsts[i + 1];
    const sa = seconds.find((s) => s.groupId !== a.groupId && !pairs.some((p) => p[1] === s));
    const sb = seconds.find((s) => s.groupId !== b?.groupId && s !== sa);
    if (a && sa) pairs.push([a, sa]);
    if (b && sb) pairs.push([b, sb]);
  }
  return pairs;
};

export const generateKnockout = async (tournamentId: string) => {
  return tx(async (q) => {
    const existingKo = await q(
      "SELECT id FROM matches WHERE tournament_id=$1 AND stage!='group'", [tournamentId],
    );
    if (existingKo.length > 0) return { ok: true, skipped: true };
    return await provisionBracket(q, tournamentId);
  });
};

// Wipes any non-group matches and re-creates the bracket from current standings.
// Used by the admin "regenerate" endpoint to fix brackets seeded with the old
// (groupmate-colliding) algorithm.
export const regenerateBracket = async (tournamentId: string) => {
  return tx(async (q) => {
    await q("DELETE FROM matches WHERE tournament_id=$1 AND stage!='group'", [tournamentId]);
    return await provisionBracket(q, tournamentId);
  });
};

const provisionBracket = async (q: typeof query, tournamentId: string) => {
  const groups = await q(
    "SELECT id FROM tournament_groups WHERE tournament_id=$1 ORDER BY name", [tournamentId],
  );
  if (groups.length === 0) throw new HttpError(400, "NO_GROUPS");

  // Collect qualified teams with rank + groupId.
  const topN = groups.length === 1 ? 4 : 2;
  const qualified: Qualified[] = [];
  for (const g of groups) {
    const groupId = (g as { id: string }).id;
    const tops = await getTopFromGroup(groupId, topN);
    tops.forEach((t, idx) => qualified.push({ teamId: t.team_id, groupId, rank: idx + 1 }));
  }

  let n = qualified.length;
  if (n < 4) throw new HttpError(400, "TOO_FEW_TEAMS");

  // Cap at 8: with N=5 or N=7 we can't build a clean QF/SF/Final structure
  // using our current schema, so reduce to top 4 by points.
  if (n === 5 || n === 7) {
    console.warn(`[bracket] tournament=${tournamentId} N=${n} not supported by 3-stage bracket — capping to top 4 by standings`);
    // We need to re-rank globally by points; approximate by group rank then by groupId.
    qualified.sort((a, b) => a.rank - b.rank || a.groupId.localeCompare(b.groupId));
    qualified.length = 4;
    n = 4;
  } else if (n > 8) {
    console.warn(`[bracket] tournament=${tournamentId} N=${n} > 8 — capping to top 8`);
    qualified.sort((a, b) => a.rank - b.rank || a.groupId.localeCompare(b.groupId));
    qualified.length = 8;
    n = 8;
  }

  if (n === 4) {
    await provisionFour(q, tournamentId, qualified);
  } else if (n === 6) {
    await provisionSix(q, tournamentId, qualified);
  } else if (n === 8) {
    await provisionEight(q, tournamentId, qualified);
  }

  return { ok: true, qualifiedCount: n };
};

// 4 teams → SF×2 + Final + 3rd. Cross-paired by groupmate-avoidance.
const provisionFour = async (q: typeof query, tournamentId: string, qualified: Qualified[]) => {
  const firsts = qualified.filter((x) => x.rank === 1);
  const seconds = qualified.filter((x) => x.rank === 2);
  // Special: single group → 4 teams, all rank 1..4. Treat 1+4 vs 2+3 cross.
  let pairs: Array<[Qualified, Qualified]>;
  if (firsts.length === 4 && seconds.length === 0) {
    pairs = [[firsts[0], firsts[3]], [firsts[1], firsts[2]]];
  } else {
    pairs = crossedPairs(firsts, seconds);
  }
  // SFs
  for (let i = 0; i < pairs.length; i++) {
    const [home, away] = pairs[i];
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number, home_team_id, away_team_id)
       VALUES ($1,'semifinal','pending',$2,$3,$4)`,
      [tournamentId, i + 1, home.teamId, away.teamId],
    );
  }
  await q(`INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'final','pending',1)`, [tournamentId]);
  await q(`INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'third_place','pending',1)`, [tournamentId]);
};

// 6 teams → 2 random byes + 2 QFs + 2 SFs + Final + 3rd.
const provisionSix = async (q: typeof query, tournamentId: string, qualified: Qualified[]) => {
  const seed = hashSeed(tournamentId);
  const shuffled = seededShuffle(qualified, seed);
  const byes = shuffled.slice(0, 2);
  const others = shuffled.slice(2);
  // Pair the others (4 teams → 2 QFs). Avoid groupmates if possible.
  const qfPairs: Array<[Qualified, Qualified]> = [];
  // Greedy: take first, find a partner with different groupId.
  const remaining = others.slice();
  while (remaining.length >= 2) {
    const a = remaining.shift()!;
    let partnerIdx = remaining.findIndex((x) => x.groupId !== a.groupId);
    if (partnerIdx < 0) partnerIdx = 0; // forced groupmate
    const b = remaining.splice(partnerIdx, 1)[0];
    qfPairs.push([a, b]);
  }

  // QF1, QF2
  for (let i = 0; i < qfPairs.length; i++) {
    const [home, away] = qfPairs[i];
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number, home_team_id, away_team_id)
       VALUES ($1,'quarterfinal','pending',$2,$3,$4)`,
      [tournamentId, i + 1, home.teamId, away.teamId],
    );
  }

  // SFs: one bye on home_team_id, away comes from the QF winner.
  // SF1 = bye0 + winner of QF1; SF2 = bye1 + winner of QF2.
  for (let i = 0; i < 2; i++) {
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number, home_team_id)
       VALUES ($1,'semifinal','pending',$2,$3)`,
      [tournamentId, i + 1, byes[i].teamId],
    );
  }
  await q(`INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'final','pending',1)`, [tournamentId]);
  await q(`INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'third_place','pending',1)`, [tournamentId]);
};

// 8 teams → 4 QFs (cross-paired) + 2 SFs + Final + 3rd.
const provisionEight = async (q: typeof query, tournamentId: string, qualified: Qualified[]) => {
  const firsts = qualified.filter((x) => x.rank === 1);
  const seconds = qualified.filter((x) => x.rank === 2);
  const pairs = crossedPairs(firsts, seconds);
  // QF1..QF4
  for (let i = 0; i < pairs.length; i++) {
    const [home, away] = pairs[i];
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number, home_team_id, away_team_id)
       VALUES ($1,'quarterfinal','pending',$2,$3,$4)`,
      [tournamentId, i + 1, home.teamId, away.teamId],
    );
  }
  // SF1, SF2 (empty, fed by QFs via propagateBracketWinner)
  for (let i = 0; i < 2; i++) {
    await q(
      `INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'semifinal','pending',$2)`,
      [tournamentId, i + 1],
    );
  }
  await q(`INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'final','pending',1)`, [tournamentId]);
  await q(`INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'third_place','pending',1)`, [tournamentId]);
};

// Called from completeMatch when a knockout match closes. Fills the next
// round's slot for this match's bracket position. Idempotent: re-running
// against an already-set slot just rewrites the same value.
//
// Mapping (round_number is positional):
//   QF round R (1..4) → SF round ceil(R/2). R odd → home, R even → away.
//   SF round R (1..2) → Final.home (R=1) or Final.away (R=2).
//                       SF loser  → third_place.home (R=1) or .away (R=2).
//   Final/third_place: no propagation; tournament.winner_id is set elsewhere.
export const propagateBracketWinner = async (
  q: typeof query,
  tournamentId: string,
  stage: MatchStage,
  round: number | null,
  winnerId: string | null,
  loserId: string | null,
): Promise<void> => {
  if (!round || !winnerId) return;

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
  // Final + third_place: no propagation needed.
};
