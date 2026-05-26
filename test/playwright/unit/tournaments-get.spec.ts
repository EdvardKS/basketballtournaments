// Origen documental:
//   - sdd/constitution/tournaments.md (GET /tournaments/:id devuelve detalle + regs + teams)
//   - backend/src/routes/tournaments.ts:39-46

import { test, expect } from "../support/fixtures.js";
import { makeOpenTournamentPayload } from "../support/seed.js";
import { softDeleteTournament, cleanupLiveTournaments, runSuffix } from "../support/api.js";

test.describe("GET /tournaments/:id (función)", () => {
  test.beforeEach(async ({ apiAdmin }) => {
    await cleanupLiveTournaments(apiAdmin);
  });

  test("id inexistente → 404", async ({ apiAnon }) => {
    const res = await apiAnon.get("/tournaments/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });

  test("id válido → {tournament, registrations, teams}", async ({ apiAdmin, apiAnon }) => {
    const payload = makeOpenTournamentPayload(`E2E get-by-id ${runSuffix()}`);
    const create = await apiAdmin.post("/tournaments", payload);
    expect(create.status(), `body=${await create.text()}`).toBe(201);
    const created = await create.json();

    try {
      const res = await apiAnon.get(`/tournaments/${created.id}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("tournament");
      expect(body).toHaveProperty("registrations");
      expect(body).toHaveProperty("teams");
      expect(body.tournament.id).toBe(created.id);
      expect(body.tournament.name).toBe(payload.name);
      expect(Array.isArray(body.registrations)).toBe(true);
      expect(Array.isArray(body.teams)).toBe(true);
    } finally {
      await softDeleteTournament(apiAdmin, created.id, payload.name).catch(() => undefined);
    }
  });
});
