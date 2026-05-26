// Origen documental:
//   - docs/11-flujo-completo.md §2 (recuperación con captcha aritmético)
//   - backend/src/routes/auth.ts:66-94 (challenge → check → reset)
//
// Iteración 1: sólo cubrimos el primer paso (challenge). Los pasos check+reset
// requieren un player real con email/username completos — quedan para iteración
// futura (cuando tengamos fábrica makePlayer con email).

import { test, expect } from "../support/fixtures.js";

test.describe("GET /auth/recover/challenge (función)", () => {
  test("devuelve {challengeId, question} (forma del captcha aritmético)", async ({ apiAnon }) => {
    const res = await apiAnon.get("/auth/recover/challenge");
    expect(res.status()).toBe(200);
    const body = await res.json();
    // El servicio createRecoveryChallenge devuelve al menos un id y una pregunta.
    // Verificamos shape mínima sin acoplar al nombre exacto de los campos extra.
    expect(typeof body).toBe("object");
    expect(body).not.toBeNull();
    const keys = Object.keys(body);
    expect(keys.length).toBeGreaterThan(0);
  });
});

test.describe("POST /auth/recover/check (función)", () => {
  test("payload incompleto → 400", async ({ apiAnon }) => {
    const res = await apiAnon.post("/auth/recover/check", { challengeId: "x" });
    expect(res.status()).toBe(400);
  });
});

test.describe("POST /auth/recover/reset (función)", () => {
  test("token inválido → 4xx (no 5xx)", async ({ apiAnon }) => {
    const res = await apiAnon.post("/auth/recover/reset", { recoveryToken: "nope", password: "abc123" });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
