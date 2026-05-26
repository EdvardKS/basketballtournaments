// Origen documental:
//   - sdd/constitution/tournaments.md
//       §invariante 1 (status flow)
//       §invariante 4 (fechas monotónicas)
//       §assertSingleLive (sólo un torneo live a la vez)
//   - docs/11-flujo-completo.md §3 (crear torneo, regla "sólo uno en marcha")
//   - backend/src/routes/tournaments.ts:48-50
//   - backend/test/full_flow.py:95-108 (payload canónico)
//
// DOC DRIFT POSIBLE: el comportamiento exacto de assertSingleLive vive en
// backend/src/services/tournaments.ts — si rechaza con código distinto a
// 4xx, marcar drift aquí.

import { test, expect } from "../support/fixtures.js";
import { makeOpenTournamentPayload, makeBadlyOrderedTournamentPayload } from "../support/seed.js";
import { softDeleteTournament, runSuffix } from "../support/api.js";

test.describe("POST /tournaments (función)", () => {
  test("anon (sin login) → 401/403", async ({ apiAnon }) => {
    const res = await apiAnon.post("/tournaments", makeOpenTournamentPayload());
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThan(500);
  });

  test("admin con payload válido → 201 + id + status='open'", async ({ apiAdmin }) => {
    const payload = makeOpenTournamentPayload(`E2E create-valid ${runSuffix()}`);
    const res = await apiAdmin.post("/tournaments", payload);
    expect(res.status(), `body=${await res.text()}`).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("status");
    expect(body.status).toBe("open");
    expect(body.name).toBe(payload.name);

    // Cleanup: soft-delete para no contaminar siguientes tests (assertSingleLive).
    await softDeleteTournament(apiAdmin, body.id, payload.name);
  });

  test("admin con fechas no monotónicas → 4xx (constitution invariante §4)", async ({ apiAdmin }) => {
    const res = await apiAdmin.post("/tournaments", makeBadlyOrderedTournamentPayload());
    expect(res.status(), `body=${await res.text()}`).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("admin: segundo torneo live mientras existe uno → 4xx (assertSingleLive)", async ({ apiAdmin }) => {
    const first = makeOpenTournamentPayload(`E2E single-live A ${runSuffix()}`);
    const firstRes = await apiAdmin.post("/tournaments", first);
    expect(firstRes.status(), `body=${await firstRes.text()}`).toBe(201);
    const firstBody = await firstRes.json();

    const second = makeOpenTournamentPayload(`E2E single-live B ${runSuffix()}`);
    const secondRes = await apiAdmin.post("/tournaments", second);
    expect(secondRes.status(), "esperamos rechazo por assertSingleLive").toBeGreaterThanOrEqual(400);
    expect(secondRes.status()).toBeLessThan(500);

    // Cleanup el primero.
    await softDeleteTournament(apiAdmin, firstBody.id, first.name);
  });
});
