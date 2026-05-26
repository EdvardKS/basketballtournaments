// Test data factories. Ported from backend/test/full_flow.py:seed_player.
// Mobile numbers must be globally unique within a DB — see
// docs/11-flujo-completo.md §14 ("móvil ya registrado").

import { runSuffix } from "./api.js";

const RUN_PREFIX = String(Math.floor(Date.now() / 1000)).slice(-6);
let counter = 0;

export function uniqueMobile(): string {
  counter += 1;
  // 11 digits: 9 + 6-digit run prefix + 4-digit counter.
  return `9${RUN_PREFIX}${String(counter).padStart(4, "0")}`;
}

export interface SeedPlayer {
  name: string;
  mobile: string;
  password: string;
  gdprAccepted: boolean;
  position: string;
}

export function makePlayerPayload(tag = "E2E", idx = counter + 1): SeedPlayer {
  return {
    name: `${tag} Jugador ${String(idx).padStart(3, "0")}`,
    mobile: uniqueMobile(),
    password: "x123456",
    gdprAccepted: true,
    position: "base",
  };
}

// Returns YYYY-MM-DD strings relative to today.
function shiftDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Open tournament with sensible default windows (mirrors full_flow.py:run_flow
// initial values: inscription started, draft window in the future).
export function makeOpenTournamentPayload(label: string = `E2E ${runSuffix()}`) {
  return {
    name: label,
    matchDate: shiftDate(30),
    inscriptionStart: shiftDate(-2),
    inscriptionEnd: shiftDate(10),
    draftStart: shiftDate(10),
    draftEnd: shiftDate(11),
    location: "Polideportivo E2E",
    description: `Playwright E2E · ${label}`,
    status: "open" as const,
  };
}

// Same payload but with non-monotonic dates: draftEnd < draftStart. Used to
// assert backend rejects invariant violation (constitution/tournaments.md §4).
export function makeBadlyOrderedTournamentPayload(label: string = `E2E BAD ${runSuffix()}`) {
  const base = makeOpenTournamentPayload(label);
  return { ...base, draftEnd: shiftDate(-5), draftStart: shiftDate(10) };
}
