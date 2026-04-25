// Date-driven tournament status transitions.
// Called lazily before any read that surfaces a tournament's state, so the
// system "wakes up" when someone looks at it and applies the right phase.
// Idempotent: safe to call repeatedly.
//
// Phases (earliest → latest), driven by the date columns set at creation:
//   today < inscription_start                      → upcoming
//   inscription_start ≤ today                      → open
//   draft_start ≤ today ≤ draft_end                → draft   (auto-creates draft_state)
//   draft_end < today < match_date                 → setup   (auto-ends draft → groups + schedule + hours_confirmed)
//   today ≥ match_date                             → active
//   status='completed' is terminal — never touched
//
// Side effects are bounded to what's needed for the new phase: starting/ending
// the draft are reused from services/draft.ts (already idempotent + 409-safe).

import { query, queryOne } from "../db/query.js";
import { toTournament } from "../db/mappers.js";
import type { Tournament, TournamentStatus } from "../types.js";
import { startDraft, endDraft } from "./draft.js";
import { HttpError } from "../middleware/error.js";

const startOfTodayUTC = (): Date => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const parseDate = (s: string | null): Date | null => {
  if (!s) return null;
  // Stored as YYYY-MM-DD; pin to UTC midnight to compare against startOfTodayUTC.
  return new Date(s.slice(0, 10) + "T00:00:00Z");
};

export const computeTargetStatus = (t: Tournament, today: Date): TournamentStatus => {
  if (t.status === "completed") return "completed";

  const is = parseDate(t.inscriptionStart);
  const ie = parseDate(t.inscriptionEnd); // currently unused (open extends until draft_start)
  const ds = parseDate(t.draftStart);
  const de = parseDate(t.draftEnd);
  const md = parseDate(t.matchDate);

  if (md && today.getTime() >= md.getTime()) return "active";
  if (de && today.getTime() >  de.getTime()) return "setup";
  if (ds && today.getTime() >= ds.getTime()) return "draft";
  if (is && today.getTime() >= is.getTime()) return "open";
  if (is && today.getTime() <  is.getTime()) return "upcoming";
  // No dates configured → leave as-is.
  void ie;
  return t.status;
};

const setStatus = async (id: string, status: TournamentStatus): Promise<void> => {
  await query("UPDATE tournaments SET status=$1 WHERE id=$2 AND status<>$1", [status, id]);
};

// Phase ordering — forward-only transitions. Once a tournament has moved
// PAST a phase (e.g. all picks completed early → setup, or all group matches
// done → active), the date-based logic must not drag it back to an earlier
// phase just because today is still inside that window.
const PHASE_ORDER: Record<string, number> = {
  upcoming: 0, open: 1, draft: 2, setup: 3,
  scheduled: 4, active: 5, completed: 6,
};

// One tournament. Reads its current row, computes the target phase, applies
// status + side effects (start/end draft) as needed.
export const transitionTournament = async (id: string): Promise<void> => {
  const row = await queryOne("SELECT * FROM tournaments WHERE id=$1", [id]);
  if (!row) return;
  const t = toTournament(row);
  if (t.status === "completed") return;

  const target = computeTargetStatus(t, startOfTodayUTC());
  if (target === t.status) {
    // Even if the status matches, ensure draft_state matches reality:
    // if we're in 'draft' but no active draft_state exists, try to start it.
    if (target === "draft") await ensureDraftStarted(id);
    return;
  }

  // Forward-only: never roll back to an earlier phase.
  if ((PHASE_ORDER[target] ?? 0) < (PHASE_ORDER[t.status] ?? 0)) return;

  // Transition logic. Order matters when target requires both a side effect
  // and a status change (e.g. → setup ends draft AND sets status).
  switch (target) {
    case "draft":
      await setStatus(id, "draft");
      await ensureDraftStarted(id);
      break;
    case "setup":
      await ensureDraftEnded(id);
      // endDraft already sets status='setup' + hours_confirmed=true.
      break;
    case "active":
      // If we jumped straight to match day without ending the draft first
      // (admin set match_date too aggressively), still close it gracefully.
      await ensureDraftEnded(id);
      await setStatus(id, "active");
      break;
    default:
      await setStatus(id, target);
  }
};

const ensureDraftStarted = async (tournamentId: string): Promise<void> => {
  const active = await queryOne(
    "SELECT id FROM draft_state WHERE tournament_id=$1 AND is_active='true'",
    [tournamentId],
  );
  if (active) return;
  try {
    await startDraft(tournamentId);
  } catch (err) {
    // Not enough teams / already active → swallow. Status stays where it is;
    // we'll retry on the next request. Anything else is a real bug → rethrow.
    if (err instanceof HttpError && (err.status === 409 || err.status === 400)) {
      console.warn(`[lifecycle] cannot auto-start draft for ${tournamentId}: ${err.code}`);
      return;
    }
    throw err;
  }
};

const ensureDraftEnded = async (tournamentId: string): Promise<void> => {
  const active = await queryOne(
    "SELECT id FROM draft_state WHERE tournament_id=$1 AND is_active='true'",
    [tournamentId],
  );
  if (active) {
    try {
      await endDraft(tournamentId);
    } catch (err) {
      // Groups already exist (someone else closed first) → swallow.
      if (err instanceof HttpError && err.status === 409) {
        console.warn(`[lifecycle] endDraft no-op for ${tournamentId}: ${err.code}`);
        return;
      }
      throw err;
    }
  } else {
    // No active draft, but we still need status to reflect the phase.
    await setStatus(tournamentId, "setup");
    await query("UPDATE tournaments SET hours_confirmed=true WHERE id=$1", [tournamentId]);
  }
};

// One-shot pass over every non-completed tournament. Called at backend boot
// to recover transitions that fell through while we were down.
export const transitionAll = async (): Promise<void> => {
  const rows = await query<{ id: string }>(
    "SELECT id FROM tournaments WHERE status<>'completed'",
  );
  for (const r of rows) {
    try { await transitionTournament(r.id); }
    catch (err) { console.error(`[lifecycle] failed for ${r.id}:`, err); }
  }
};
