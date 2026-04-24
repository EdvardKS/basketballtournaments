// Apply all idempotent schema SQL files on startup.
// Ensures columns/tables added by later migrations reach existing
// production volumes that were initialised before the migration existed.
//
// Files are expected under /app/migrations/ (mounted by docker-compose
// from ./db/init/). Only *.sql files are executed, sorted alphabetically.
// Non-existent directory is a no-op (dev machines without the mount).
import fs from "node:fs";
import path from "node:path";
import { pool } from "./pool.js";

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? "/app/migrations";

export const runMigrations = async (): Promise<void> => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log(`[migrate] ${MIGRATIONS_DIR} not mounted — skipping`);
    return;
  }
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    console.log(`[migrate] no *.sql files in ${MIGRATIONS_DIR}`);
    return;
  }
  for (const f of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
    console.log(`[migrate] applying ${f} (${sql.length} bytes)`);
    try {
      await pool.query(sql);
    } catch (err) {
      console.error(`[migrate] FAILED on ${f}:`, err);
      throw err;
    }
  }
  console.log(`[migrate] done (${files.length} file${files.length === 1 ? "" : "s"})`);
};
