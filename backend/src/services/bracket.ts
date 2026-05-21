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
import { assertBracketUnlocked } from "./tournaments.js";

export type BracketFormat =
  | "top2_per_group"
  | "top1_plus_best2_seconds"
  | "top2_single_group"
  | "top4_single_group";

export type BracketSize = 2 | 4 | 8 | 16;

interface Qualified {
  teamId: string;
  groupId: string;
  groupName: string;
  rank: number;           // 1 = group winner, 2 = 2nd in group, etc.
  seedLabel: string;      // human-readable slot tag ("1º Grupo A", "Mejor 2º", …)
  points: number;
  diff: number;
  pointsFor: number;
  gamesWon: number;
}

// Fetch ALL members of a group, sorted with the canonical tiebreak order.
const getGroupRanking = async (
  q: typeof query, groupId: string, groupName: string,
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
    groupName,
    rank: idx + 1,
    seedLabel: `${idx + 1}º ${groupName}`,
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
  const groups = await q<{ id: string; name: string }>(
    "SELECT id, name FROM tournament_groups WHERE tournament_id=$1 ORDER BY name",
    [tournamentId],
  );
  if (groups.length === 0) throw new HttpError(400, "NO_GROUPS");

  const groupRankings: Qualified[][] = [];
  for (const g of groups) {
    groupRankings.push(await getGroupRanking(q, g.id, g.name));
  }

  if (format === "top2_single_group") {
    if (groupRankings.length !== 1) {
      throw new HttpError(400, "FORMAT_NEEDS_SINGLE_GROUP");
    }
    if (groupRankings[0].length < 2) {
      throw new HttpError(400, "TOO_FEW_TEAMS");
    }
    return groupRankings[0].slice(0, 2);
  }

  if (format === "top4_single_group") {
    if (groupRankings.length !== 1) {
      throw new HttpError(400, "FORMAT_NEEDS_SINGLE_GROUP");
    }
    if (groupRankings[0].length < 4) {
      throw new HttpError(400, "TOO_FEW_TEAMS");
    }
    return groupRankings[0].slice(0, 4);
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
      if (ranking[1]) {
        // Wildcards lose their group-rank label in favour of "Mejor 2º".
        // Keep their group reference so the cross-pair heuristic still
        // avoids first-round groupmate matchups when possible.
        seconds.push({ ...ranking[1], seedLabel: `Mejor 2º · ${ranking[1].groupName}` });
      }
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

// Insert a slot-only KO match (no team binding yet) carrying just the seed
// labels. Used for QF/SF/Final placeholders that are filled by winners of
// previous rounds.
const insertSlot = async (
  q: typeof query, tournamentId: string,
  stage: MatchStage, round: number,
  homeLabel: string, awayLabel: string,
) => q(
  `INSERT INTO matches
     (tournament_id, stage, status, round_number,
      home_seed_label, away_seed_label)
   VALUES ($1,$2,'pending',$3,$4,$5)`,
  [tournamentId, stage, round, homeLabel, awayLabel],
);

const provisionTwo = async (
  q: typeof query, tournamentId: string, qualified: Qualified[],
) => {
  // Direct final from the top 2 of the single group.
  const [home, away] = qualified;
  await q(
    `INSERT INTO matches
       (tournament_id, stage, status, round_number,
        home_team_id, away_team_id,
        home_seed_label, away_seed_label)
     VALUES ($1,'final','pending',1,$2,$3,$4,$5)`,
    [tournamentId, home.teamId, away.teamId, home.seedLabel, away.seedLabel],
  );
  // No third-place match for a 2-team bracket.
};

const provisionFour = async (
  q: typeof query, tournamentId: string, qualified: Qualified[],
) => {
  const seeds = qualified.slice(); // already sorted globally
  const pairs: Array<[Qualified, Qualified]> = [
    [seeds[0], seeds[3]],
    [seeds[1], seeds[2]],
  ];
  for (let i = 0; i < pairs.length; i++) {
    const [home, away] = pairs[i];
    await q(
      `INSERT INTO matches
         (tournament_id, stage, status, round_number,
          home_team_id, away_team_id,
          home_seed_label, away_seed_label)
       VALUES ($1,'semifinal','pending',$2,$3,$4,$5,$6)`,
      [tournamentId, i + 1, home.teamId, away.teamId,
       home.seedLabel, away.seedLabel],
    );
  }
  await insertSlot(q, tournamentId, "final", 1, "Ganador SF 1", "Ganador SF 2");
  await insertSlot(q, tournamentId, "third_place", 1, "Perdedor SF 1", "Perdedor SF 2");
};

const provisionEight = async (
  q: typeof query, tournamentId: string, qualified: Qualified[],
) => {
  const sorted = qualified.slice();
  const top = sorted.slice(0, 4);
  const bot = sorted.slice(4, 8);
  const pairs = crossPairsAvoidingGroupmates(top, bot);
  for (let i = 0; i < pairs.length; i++) {
    const [home, away] = pairs[i];
    await q(
      `INSERT INTO matches
         (tournament_id, stage, status, round_number,
          home_team_id, away_team_id,
          home_seed_label, away_seed_label)
       VALUES ($1,'quarterfinal','pending',$2,$3,$4,$5,$6)`,
      [tournamentId, i + 1, home.teamId, away.teamId,
       home.seedLabel, away.seedLabel],
    );
  }
  for (let i = 0; i < 2; i++) {
    await insertSlot(q, tournamentId, "semifinal", i + 1,
      `Ganador QF ${2 * i + 1}`, `Ganador QF ${2 * i + 2}`);
  }
  await insertSlot(q, tournamentId, "final", 1, "Ganador SF 1", "Ganador SF 2");
  await insertSlot(q, tournamentId, "third_place", 1, "Perdedor SF 1", "Perdedor SF 2");
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
      `INSERT INTO matches
         (tournament_id, stage, status, round_number,
          home_team_id, away_team_id,
          home_seed_label, away_seed_label)
       VALUES ($1,'eighth','pending',$2,$3,$4,$5,$6)`,
      [tournamentId, i + 1, home.teamId, away.teamId,
       home.seedLabel, away.seedLabel],
    );
  }
  for (let i = 0; i < 4; i++) {
    await insertSlot(q, tournamentId, "quarterfinal", i + 1,
      `Ganador Octavos ${2 * i + 1}`, `Ganador Octavos ${2 * i + 2}`);
  }
  for (let i = 0; i < 2; i++) {
    await insertSlot(q, tournamentId, "semifinal", i + 1,
      `Ganador QF ${2 * i + 1}`, `Ganador QF ${2 * i + 2}`);
  }
  await insertSlot(q, tournamentId, "final", 1, "Ganador SF 1", "Ganador SF 2");
  await insertSlot(q, tournamentId, "third_place", 1, "Perdedor SF 1", "Perdedor SF 2");
};

// --- Public API -----------------------------------------------------------

interface BracketConfig {
  format: BracketFormat;
  size: BracketSize | null;
  qualifiersPerGroup: number | null;
  wildcards: number | null;
}

const readBracketConfig = async (
  q: typeof query, tournamentId: string,
): Promise<BracketConfig> => {
  const row = await q<{
    bracket_format: string | null; bracket_size: number | null;
    bracket_qualifiers_per_group: number | null;
    bracket_wildcards: number | null;
  }>(
    `SELECT bracket_format, bracket_size,
            bracket_qualifiers_per_group, bracket_wildcards
       FROM tournaments WHERE id=$1`,
    [tournamentId],
  );
  if (row.length === 0) throw new HttpError(404, "TOURNAMENT_NOT_FOUND");
  const r = row[0];
  const format = (r.bracket_format ?? "top2_per_group") as BracketFormat;
  const rawSize = r.bracket_size;
  const size = rawSize === 2 || rawSize === 4 || rawSize === 8 || rawSize === 16
    ? rawSize : null;
  return {
    format, size,
    qualifiersPerGroup: r.bracket_qualifiers_per_group == null
      ? null : Number(r.bracket_qualifiers_per_group),
    wildcards: r.bracket_wildcards == null
      ? null : Number(r.bracket_wildcards),
  };
};

// Pick a bracket size that fits the qualified pool when admin didn't choose.
// The single-group formats lock their own size (2 or 4); other formats grow
// to the biggest power of two that fits the pool.
const inferSize = (n: number, format: BracketFormat): BracketSize => {
  if (format === "top2_single_group") return 2;
  if (format === "top4_single_group") return 4;
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
  await assertBracketUnlocked(tournamentId);
  return tx(async (q) => {
    await q(
      "DELETE FROM matches WHERE tournament_id=$1 AND stage!='group'",
      [tournamentId],
    );
    return await provisionBracket(q, tournamentId);
  });
};

// Plan-based qualifier selection. Pulls the top `perGroup` from every group
// then fills `wildcards` from the global pool of remaining teams sorted by
// points. Used when both fields are persisted on the tournament; otherwise
// we fall back to the named-format path.
const collectQualifiedByPlan = async (
  q: typeof query, tournamentId: string,
  perGroup: number, wildcards: number,
): Promise<Qualified[]> => {
  const groups = await q<{ id: string; name: string }>(
    "SELECT id, name FROM tournament_groups WHERE tournament_id=$1 ORDER BY name",
    [tournamentId],
  );
  if (groups.length === 0) throw new HttpError(400, "NO_GROUPS");

  const groupRankings: Qualified[][] = [];
  for (const g of groups) {
    groupRankings.push(await getGroupRanking(q, g.id, g.name));
  }

  const direct: Qualified[] = [];
  const remaining: Qualified[] = [];
  for (const ranking of groupRankings) {
    if (perGroup < 0) throw new HttpError(400, "PLAN_INVALID");
    if (perGroup > 0 && ranking.length < perGroup) {
      throw new HttpError(400, "PLAN_GROUP_TOO_SMALL",
        `El grupo ${ranking[0]?.groupName ?? "?"} no tiene ${perGroup} equipos.`);
    }
    direct.push(...ranking.slice(0, perGroup));
    remaining.push(...ranking.slice(perGroup));
  }
  remaining.sort(cmpGlobal);
  if (wildcards > remaining.length) {
    throw new HttpError(400, "PLAN_TOO_FEW_WILDCARDS",
      `Se piden ${wildcards} wildcards pero solo quedan ${remaining.length} disponibles.`);
  }
  const wild = remaining.slice(0, wildcards).map((r) => ({
    ...r, seedLabel: `Mejor wildcard · ${r.groupName}`,
  }));
  return [...direct, ...wild];
};

const provisionBracket = async (q: typeof query, tournamentId: string) => {
  const cfg = await readBracketConfig(q, tournamentId);
  const usePlan = cfg.qualifiersPerGroup != null && cfg.wildcards != null;
  const qualified = usePlan
    ? await collectQualifiedByPlan(q, tournamentId,
        cfg.qualifiersPerGroup!, cfg.wildcards!)
    : await collectQualified(q, tournamentId, cfg.format);
  const format = cfg.format;
  // With a plan, the qualifier count drives the bracket size directly. With
  // the legacy format-only path we fall back to the explicit size column.
  let rawSize: BracketSize | null;
  if (usePlan) {
    if (qualified.length !== 2 && qualified.length !== 4
        && qualified.length !== 8 && qualified.length !== 16) {
      throw new HttpError(400, "PLAN_INVALID_SIZE",
        `El plan produce ${qualified.length} clasificados; debe sumar 2, 4, 8 o 16.`);
    }
    rawSize = qualified.length as BracketSize;
  } else {
    rawSize = cfg.size;
  }

  // Global tiebreak: the qualified list lands here sorted by group rank;
  // re-sort GLOBALLY by points to fix the seeding bug where a 2nd-place
  // team with more points was getting dropped behind a weaker group winner.
  qualified.sort(cmpGlobal);

  // Legacy path enforces a 4-team minimum (or 2 for top2_single_group); the
  // plan path already validated qualified.length lands on 2/4/8/16, so no
  // extra guard is needed there.
  if (!usePlan) {
    const minTeams = format === "top2_single_group" ? 2 : 4;
    if (qualified.length < minTeams) {
      throw new HttpError(400, "TOO_FEW_TEAMS",
        `Faltan equipos para montar un cuadro (hay ${qualified.length}, hacen falta ${minTeams} mínimo).`);
    }
  }

  const size: BracketSize = rawSize ?? inferSize(qualified.length, format);
  if (qualified.length < size) {
    throw new HttpError(400, "TOO_FEW_FOR_SIZE",
      `Hay ${qualified.length} clasificados pero el cuadro está fijado a ${size}.`);
  }
  const pool = qualified.slice(0, size);

  if (size === 2)       await provisionTwo(q, tournamentId, pool);
  else if (size === 4)  await provisionFour(q, tournamentId, pool);
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
