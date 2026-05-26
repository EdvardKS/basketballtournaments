// Origen documental:
//   - sdd/constitution/tournaments.md (GET /tournaments/:id devuelve detalle + regs + teams)
//   - backend/src/routes/tournaments.ts:39-46

import { test, expect } from "../support/fixtures.js";

test.describe("GET /tournaments/:id (función)", () => {
  test("id inexistente → 404", async ({ apiAnon }) => {
    const res = await apiAnon.get("/tournaments/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });

  test("id válido → {tournament, registrations, teams}", async ({ apiAnon }) => {
    const list = await (await apiAnon.get("/tournaments")).json() as Array<{ id: string }>;
    test.skip(list.length === 0, "no tournaments to test — run after flow/01 creates one");
    const id = list[0].id;
    const res = await apiAnon.get(`/tournaments/${id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("tournament");
    expect(body).toHaveProperty("registrations");
    expect(body).toHaveProperty("teams");
    expect(body.tournament.id).toBe(id);
    expect(Array.isArray(body.registrations)).toBe(true);
    expect(Array.isArray(body.teams)).toBe(true);
  });
});
