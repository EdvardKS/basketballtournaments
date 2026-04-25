// Process entry point. Waits for DB, applies migrations, optionally
// applies example-data seeds, transitions tournament phases for any time
// that elapsed while we were down, then starts listening.
import { createApp } from "./app.js";
import { config } from "./config.js";
import { waitForDb } from "./db/pool.js";
import { runMigrations, runSeeds } from "./db/migrate.js";
import { bootstrapAdmin } from "./db/bootstrap-admin.js";
import { transitionAll } from "./services/lifecycle.js";

const main = async () => {
  await waitForDb();
  await runMigrations();
  // Ensure the production admin (env-driven) exists BEFORE optional seeds,
  // so even with EXAMPLE_DATA=false the app has at least one usable login.
  await bootstrapAdmin();
  if ((process.env.EXAMPLE_DATA ?? "false").toLowerCase() === "true") {
    await runSeeds();
  } else {
    console.log("[seed] EXAMPLE_DATA=false — skipping demo data");
  }
  await transitionAll();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[backend] listening on :${config.port}`);
  });
};

main().catch((err) => {
  console.error("[backend] fatal", err);
  process.exit(1);
});
