// Process entry point. Waits for DB, then starts listening.
import { createApp } from "./app.js";
import { config } from "./config.js";
import { waitForDb } from "./db/pool.js";

const main = async () => {
  await waitForDb();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[backend] listening on :${config.port}`);
  });
};

main().catch((err) => {
  console.error("[backend] fatal", err);
  process.exit(1);
});
