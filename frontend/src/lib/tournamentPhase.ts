// Single source of truth for "what sub-phase is this tournament in?"
// Derived from the matches array — no caching, no extra round-trip.
//
// We keep the backend status untouched (it still moves: open → draft → setup
// → active → completed via lifecycle.ts and the final-match hook). What
// changes is the *visual* phase the public page and admin panel use to
// reorder blocks: groups vs knockouts vs champion.
import type { Match, TournamentStatus } from "./types.js";

export type TournamentPhase =
  | "pre"         // pre-draft — open / upcoming
  | "draft"       // draft in progress
  | "preMatchday" // post-draft, matches scaffolded, víspera not reached yet
  | "groups"      // some group match still pending (víspera or beyond)
  | "knockouts"   // groups all completed OR a non-group match exists
  | "completed";  // the final has been scored

// We treat "víspera" (the day BEFORE matchDate) as the cutoff: while today
// is strictly earlier than that, the admin is still in config land — even
// if the backend already auto-generated groups + KO placeholders. From the
// víspera onwards, the panel flips to its live-match view.
const isBeforeEve = (matchDate: string | null | undefined): boolean => {
  if (!matchDate) return false;
  const md = new Date(matchDate + "T00:00:00").getTime();
  if (Number.isNaN(md)) return false;
  const eve = md - 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() < eve;
};

export const derivePhase = (
  tournament: { status: TournamentStatus; matchDate?: string | null },
  matches: Pick<Match, "stage" | "status">[],
): TournamentPhase => {
  // 1. Authoritative completion: backend already flipped, OR the final match closed.
  if (tournament.status === "completed") return "completed";
  const final = matches.find((m) => m.stage === "final");
  if (final && final.status === "completed") return "completed";

  const anyMatchTouched = matches.some((m) => m.status !== "pending");

  // 2. Pre-matchday: matches scaffolded but none touched, still days away.
  if (matches.length > 0 && !anyMatchTouched && isBeforeEve(tournament.matchDate)) {
    return "preMatchday";
  }

  // 3. Any knockout match exists → bracket is live (víspera or beyond).
  const hasKnockout = matches.some((m) => m.stage !== "group");
  if (hasKnockout) return "knockouts";

  // 4. Group phase: pending vs all-done (transient before backend creates the bracket).
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
