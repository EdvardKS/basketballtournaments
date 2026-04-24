// Process entry point. Waits for DB, applies migrations, then starts listening.
import { createApp } from "./app.js";
import { config } from "./config.js";
import { waitForDb } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";

const main = async () => {
  await waitForDb();
  await runMigrations();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[backend] listening on :${config.port}`);
  });
};

main().catch((err) => {
  console.error("[backend] fatal", err);
  process.exit(1);
});
