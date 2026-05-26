// Origen documental:
//   - sdd/constitution/tournaments.md (GET /tournaments público)
//   - backend/src/routes/tournaments.ts:35-37

import { test, expect } from "../support/fixtures.js";

test.describe("GET /tournaments (función)", () => {
  test("anon recibe array (público)", async ({ apiAnon }) => {
    const res = await apiAnon.get("/tournaments");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("cada elemento tiene id + status + name", async ({ apiAnon }) => {
    const res = await apiAnon.get("/tournaments");
    expect(res.status()).toBe(200);
    const list = await res.json() as Array<Record<string, unknown>>;
    for (const t of list) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("status");
      expect(t).toHaveProperty("name");
    }
  });
});
