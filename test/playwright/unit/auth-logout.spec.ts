// Origen documental:
//   - sdd/constitution/auth.md          (session cookie)
//   - backend/src/routes/auth.ts:35-41  (POST /auth/logout limpia cookie basket_sid)

import { test, expect } from "../support/fixtures.js";

test.describe("POST /auth/logout (función)", () => {
  test("tras logout, /auth/me responde 401", async ({ apiAdmin }) => {
    const before = await apiAdmin.get("/auth/me");
    expect(before.status(), "pre-logout /me debe ser 200").toBe(200);

    const out = await apiAdmin.post("/auth/logout");
    expect(out.status()).toBe(200);
    const body = await out.json();
    expect(body).toEqual({ ok: true });

    const after = await apiAdmin.get("/auth/me");
    expect(after.status(), "post-logout /me debe ser 401").toBe(401);
  });

  test("logout sin sesión activa también responde 200 (idempotente)", async ({ apiAnon }) => {
    const res = await apiAnon.post("/auth/logout");
    // Backend destruye sesión y limpia cookie sin importar si había sesión.
    expect(res.status()).toBe(200);
  });
});
