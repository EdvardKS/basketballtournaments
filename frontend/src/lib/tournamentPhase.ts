// Single source of truth for "what sub-phase is this tournament in?"
// Derived from the matches array — no caching, no extra round-trip.
//
// We keep the backend status untouched (it still moves: open → draft → setup
// → active → completed via lifecycle.ts and the final-match hook). What
// changes is the *visual* phase the public page and admin panel use to
// reorder blocks: groups vs knockouts vs champion.
import type { Match, TournamentStatus } from "./types.js";

export type TournamentPhase =
  | "pre"        // pre-draft — open / upcoming
  | "draft"      // draft in progress
  | "groups"     // some group match still pending
  | "knockouts"  // groups all completed OR a non-group match exists
  | "completed"; // the final has been scored

export const derivePhase = (
  tournament: { status: TournamentStatus },
  matches: Pick<Match, "stage" | "status">[],
): TournamentPhase => {
  // 1. Authoritative completion: backend already flipped, OR the final match closed.
  if (tournament.status === "completed") return "completed";
  const final = matches.find((m) => m.stage === "final");
  if (final && final.status === "completed") return "completed";

  // 2. Any knockout match exists → bracket is live.
  const hasKnockout = matches.some((m) => m.stage !== "group");
  if (hasKnockout) return "knockouts";

  // 3 & 4. Group phase: pending vs all-done (transient before backend creates the bracket).
  const groupMatches = matches.filter((m) => m.stage === "group");
  if (groupMatches.length > 0) {
    const allDone = groupMatches.every((m) => m.status === "completed");
    return allDone ? "knockouts" : "groups";
  }

  // 5. Draft.
  if (tournament.status === "draft") return "draft";

  // 6. Default — nothing scheduled yet.
  return "pre";
};
