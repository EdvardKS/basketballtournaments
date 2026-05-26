// Runs once before the suite. Logs in admin and removes every live
// tournament so the suite starts from a known clean state without
// requiring a full docker reset between every test file.

import { request as playwrightRequest } from "@playwright/test";
import { API_BASE, makeClient, loginAdmin, cleanupLiveTournaments } from "./api.js";

export default async function globalSetup(): Promise<void> {
  const ctx = await playwrightRequest.newContext({ baseURL: API_BASE });
  try {
    const client = makeClient(ctx, null);
    await loginAdmin(client);
    const removed = await cleanupLiveTournaments(client);
    console.log(`[global-setup] cleaned ${removed} live tournament(s)`);
  } finally {
    await ctx.dispose();
  }
}
