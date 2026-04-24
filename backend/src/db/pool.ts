// Shared pg pool. A single pool per process is enough for our traffic.
import pg from "pg";
import { config } from "../config.js";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("[db] idle client error", err);
});

export const waitForDb = async (retries = 20): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      console.log(`[db] waiting… (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Database unreachable after retries");
};
