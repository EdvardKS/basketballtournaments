// Flujo 01 — Bootstrap + Crear primer torneo
//
// Origen documental:
//   - docs/11-flujo-completo.md §1 (encender app), §2 (login), §3 (crear torneo)
//   - sdd/constitution/constitution.md §3 (auth + tournaments bounded contexts)
//   - sdd/constitution/auth.md (login → cookie sesión)
//   - sdd/constitution/tournaments.md
//       §invariante 1 (status flow comienza en upcoming/open)
//       §invariante 4 (fechas monotónicas)
//       §invariante 5 (soft delete via deleted_at)
//       §assertSingleLive
//
// Precondición operativa: stack reseteado (ver README.md). DB debe arrancar
// sin torneos live. Si hay residuos de runs anteriores → fallar early con
// mensaje explícito.

import { test, expect } from "../support/fixtures.js";
import { loginAdmin, softDeleteTournament, runSuffix } from "../support/api.js";
import { makeOpenTournamentPayload } from "../support/seed.js";

const LIVE_STATUSES = new Set(["upcoming", "open", "draft", "setup", "scheduled", "active"]);

test.describe("Flow 01 · bootstrap + crear torneo", () => {
  test.describe.configure({ mode: "serial" });

  test("§1+§2 — login admin con cookie bootstrap", async ({ apiAnon }) => {
    const player = await loginAdmin(apiAnon);
    expect(player.role).toBe("admin");

    const me = await apiAnon.get("/auth/me");
    expect(me.status()).toBe(200);
    const meBody = await me.json();
    expect(meBody.player.id).toBe(player.id);
  });

  test("§3 — precondición: no hay torneos live (stack reseteado)", async ({ apiAnon }) => {
    const res = await apiAnon.get("/tournaments");
    expect(res.status()).toBe(200);
    const list = await res.json() as Array<{ id: string; status: string; name: string }>;
    const live = list.filter((t) => LIVE_STATUSES.has(t.status));
    expect(
      live,
      `live tournaments hallados → resetea el stack antes del flow: ${JSON.stringify(live)}`,
    ).toEqual([]);
  });

  test("§3 — admin crea torneo → 201 + status=open", async ({ apiAdmin }) => {
    const payload = makeOpenTournamentPayload(`Flow01 ${runSuffix()}`);
    const create = await apiAdmin.post("/tournaments", payload);
    expect(create.status(), `body=${await create.text()}`).toBe(201);
    const tourney = await create.json();
    expect(tourney.id).toBeTruthy();
    expect(tourney.status).toBe("open");

    const detail = await apiAdmin.get(`/tournaments/${tourney.id}`);
    expect(detail.status()).toBe(200);
    const detailBody = await detail.json();
    expect(detailBody.tournament.id).toBe(tourney.id);
    expect(detailBody.tournament.name).toBe(payload.name);
    expect(detailBody.registrations).toEqual([]);
    expect(detailBody.teams).toEqual([]);

    // assertSingleLive: intento segundo torneo → rechazado.
    const second = await apiAdmin.post("/tournaments", makeOpenTournamentPayload(`Flow01 dup ${runSuffix()}`));
    expect(second.status(), "assertSingleLive debe bloquear segundo torneo live").toBeGreaterThanOrEqual(400);
    expect(second.status()).toBeLessThan(500);

    // Soft delete y verificar que desaparece del listado público.
    const del = await softDeleteTournament(apiAdmin, tourney.id, payload.name);
    expect(del.status(), `body=${await del.text()}`).toBe(200);

    const after = await apiAdmin.get("/tournaments");
    const stillThere = (await after.json() as Array<{ id: string }>).find((t) => t.id === tourney.id);
    expect(stillThere, "torneo soft-deleted no debe aparecer en GET público").toBeUndefined();
  });
});
