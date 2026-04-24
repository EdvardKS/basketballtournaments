// Schema migrations runner.
//
// Tracks applied migrations in a `schema_migrations` table (filename +
// sha256 + timestamp). On each call:
//   1. Ensures the tracking table exists.
//   2. Lists *.sql files in MIGRATIONS_DIR sorted alphabetically.
//   3. Applies any file whose filename is not yet in the table, wrapping
//      each migration in its own transaction (all-or-nothing per file).
//   4. Warns (but does not fail) on checksum drift — migrations are
//      forward-only; once applied a file should not be edited.
//
// File naming convention: NNN_short_description.sql (e.g. 009_add_foo.sql).
// Order = lexicographic, so zero-pad and never renumber an applied file.
// All SQL statements should be idempotent (IF NOT EXISTS / ADD COLUMN IF
// NOT EXISTS) so the same migration can safely run against a DB that was
// bootstrapped outside this system (e.g. legacy prod volume).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pool } from "./pool.js";

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? "/app/migrations";

const sha256 = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex");

const ensureTable = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

export interface MigrationStatus {
  filename: string;
  checksum: string;
  applied: boolean;
  drift: boolean;
  appliedChecksum?: string;
  appliedAt?: string;
}

const listLocalFiles = (): { filename: string; sql: string; checksum: string }[] => {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((filename) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");
      return { filename, sql, checksum: sha256(sql) };
    });
};

export const getStatus = async (): Promise<MigrationStatus[]> => {
  await ensureTable();
  const { rows } = await pool.query<{ filename: string; checksum: string; applied_at: Date }>(
    "SELECT filename, checksum, applied_at FROM schema_migrations",
  );
  const applied = new Map(rows.map((r) => [r.filename, r]));
  return listLocalFiles().map(({ filename, checksum }) => {
    const prev = applied.get(filename);
    return {
      filename,
      checksum,
      applied: prev != null,
      drift: prev != null && prev.checksum !== checksum,
      appliedChecksum: prev?.checksum,
      appliedAt: prev?.applied_at?.toISOString(),
    };
  });
};

export const runMigrations = async (): Promise<void> => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log(`[migrate] ${MIGRATIONS_DIR} not mounted — skipping`);
    return;
  }
  await ensureTable();

  const files = listLocalFiles();
  if (files.length === 0) {
    console.log(`[migrate] no *.sql files in ${MIGRATIONS_DIR}`);
    return;
  }

  const { rows } = await pool.query<{ filename: string; checksum: string }>(
    "SELECT filename, checksum FROM schema_migrations",
  );
  const applied = new Map(rows.map((r) => [r.filename, r.checksum]));

  let newlyApplied = 0;
  for (const { filename, sql, checksum } of files) {
    const prev = applied.get(filename);
    if (prev === checksum) continue;                      // already applied, unchanged
    if (prev && prev !== checksum) {
      console.warn(`[migrate] WARN: ${filename} checksum drift (forward-only — not re-running). ` +
        `Create a new migration file to alter the schema further.`);
      continue;
    }

    console.log(`[migrate] applying ${filename}`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename, checksum) VALUES ($1,$2) " +
        "ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW()",
        [filename, checksum],
      );
      await client.query("COMMIT");
      newlyApplied++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrate] FAILED on ${filename}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  if (newlyApplied === 0) {
    console.log(`[migrate] DB up to date (${files.length} migration${files.length === 1 ? "" : "s"} tracked)`);
  } else {
    console.log(`[migrate] applied ${newlyApplied} new migration${newlyApplied === 1 ? "" : "s"} / ${files.length} total`);
  }
};
