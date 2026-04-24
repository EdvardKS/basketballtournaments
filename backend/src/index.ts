// Process entry point. Waits for DB, applies migrations, optionally
// applies example-data seeds, then starts listening.
import { createApp } from "./app.js";
import { config } from "./config.js";
import { waitForDb } from "./db/pool.js";
import { runMigrations, runSeeds } from "./db/migrate.js";

const main = async () => {
  await waitForDb();
  await runMigrations();
  if ((process.env.EXAMPLE_DATA ?? "false").toLowerCase() === "true") {
    await runSeeds();
  } else {
    console.log("[seed] EXAMPLE_DATA=false — skipping demo data");
  }
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[backend] listening on :${config.port}`);
  });
};

main().catch((err) => {
  console.error("[backend] fatal", err);
  process.exit(1);
});
