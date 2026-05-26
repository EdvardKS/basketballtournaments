// Origen documental:
//   - sdd/constitution/auth.md         (Login con móvil/email/usuario, cookie sesión)
//   - docs/11-flujo-completo.md §2     (Iniciar sesión)
//   - backend/test/full_flow.py:77-92  (shape de respuesta: {player:{id, role}})
//   - backend/src/routes/auth.ts:20-33 (zod schema identifier+password)

import { test, expect } from "../support/fixtures.js";
import { ADMIN_USER, ADMIN_PASS, loginAdmin } from "../support/api.js";

test.describe("POST /auth/login (función)", () => {
  test("admin con credenciales bootstrap responde 200 + player.role=admin", async ({ apiAnon }) => {
    const res = await apiAnon.post("/auth/login", { identifier: ADMIN_USER, password: ADMIN_PASS });
    expect(res.status(), `body=${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("player");
    expect(body.player).toHaveProperty("id");
    expect(body.player.role).toBe("admin");
  });

  test("credenciales inválidas devuelven 4xx (no 5xx)", async ({ apiAnon }) => {
    const res = await apiAnon.post("/auth/login", { identifier: ADMIN_USER, password: "wrong-pass-xxx" });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("payload malformado (sin password) → 400", async ({ apiAnon }) => {
    const res = await apiAnon.post("/auth/login", { identifier: ADMIN_USER });
    expect(res.status()).toBe(400);
  });

  test("helper loginAdmin set cookie reutilizable", async ({ apiAnon }) => {
    const player = await loginAdmin(apiAnon);
    expect(player.role).toBe("admin");
    const me = await apiAnon.get("/auth/me");
    expect(me.status()).toBe(200);
    const meBody = await me.json();
    expect(meBody.player.id).toBe(player.id);
  });
});
