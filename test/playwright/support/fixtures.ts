// Playwright fixtures: api client + auto-login admin variants.
//
// Use `apiAnon` for endpoints reachable without auth (login, GET /tournaments).
// Use `apiAdmin` for admin-gated endpoints (POST/PATCH/DELETE /tournaments).
// Each fixture creates its own APIRequestContext with isolated cookie jar.

import { test as base, request as playwrightRequest } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { API_BASE, makeClient, loginAdmin, type ApiClient } from "./api.js";

type Fixtures = {
  apiAnon: ApiClient;
  apiAdmin: ApiClient;
  rawRequest: APIRequestContext;
};

export const test = base.extend<Fixtures>({
  rawRequest: async ({}, use) => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_BASE });
    await use(ctx);
    await ctx.dispose();
  },

  apiAnon: async ({}, use, testInfo) => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_BASE });
    await use(makeClient(ctx, testInfo));
    await ctx.dispose();
  },

  apiAdmin: async ({}, use, testInfo) => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_BASE });
    const client = makeClient(ctx, testInfo);
    await loginAdmin(client);
    await use(client);
    await ctx.dispose();
  },
});

export { expect } from "@playwright/test";
