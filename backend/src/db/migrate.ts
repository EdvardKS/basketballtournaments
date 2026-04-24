// Schema migrations + example-data seeds runner.
//
// Two independent trackers, same machinery:
//   schema_migrations  ← mandatory, always applied on boot
//   schema_seeds       ← optional, applied on boot only when EXAMPLE_DATA=true
//
// Each tracker records (filename, checksum, applied_at). On each call:
//   1. Ensures the tracking table exists.
//   2. Lists *.sql files in the directory, sorted alphabetically.
//   3. Applies any file whose filename is not yet in the table, wrapping
//      each application in its own transaction (all-or-nothing per file).
//   4. Warns (but does not fail) on checksum drift — forward-only.
//
// Naming convention: NNN_short_description.sql. Lexicographic order
// controls apply order, so zero-pad and never renumber an applied file.
// All SQL should be idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING)
// so the same file can safely run against a DB bootstrapped out-of-band.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pool } from "./pool.js";

export const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? "/app/migrations";
export const SEEDS_DIR      = process.env.SEEDS_DIR      ?? "/app/seeds";

const sha256 = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex");

const ensureTable = async (name: string): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${name} (
      filename    TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

interface LocalFile { filename: string; sql: string; checksum: string }

const listFiles = (dir: string): LocalFile[] => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((filename) => {
      const sql = fs.readFileSync(path.join(dir, filename), "utf8");
      return { filename, sql, checksum: sha256(sql) };
    });
};

export interface FileStatus {
  filename: string;
  checksum: string;
  applied: boolean;
  drift: boolean;
  appliedChecksum?: string;
  appliedAt?: string;
}

export const getStatus = async (kind: "migration" | "seed"): Promise<FileStatus[]> => {
  const dir = kind === "migration" ? MIGRATIONS_DIR : SEEDS_DIR;
  const table = kind === "migration" ? "schema_migrations" : "schema_seeds";
  await ensureTable(table);
  const { rows } = await pool.query<{ filename: string; checksum: string; applied_at: Date }>(
    `SELECT filename, checksum, applied_at FROM ${table}`,
  );
  const applied = new Map(rows.map((r) => [r.filename, r]));
  return listFiles(dir).map(({ filename, checksum }) => {
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

const applyDir = async (dir: string, table: string, label: string): Promise<void> => {
  if (!fs.existsSync(dir)) {
    console.log(`[${label}] ${dir} not mounted — skipping`);
    return;
  }
  await ensureTable(table);

  const files = listFiles(dir);
  if (files.length === 0) {
    console.log(`[${label}] no *.sql files in ${dir}`);
    return;
  }

  const { rows } = await pool.query<{ filename: string; checksum: string }>(
    `SELECT filename, checksum FROM ${table}`,
  );
  const applied = new Map(rows.map((r) => [r.filename, r.checksum]));

  let newlyApplied = 0;
  for (const { filename, sql, checksum } of files) {
    const prev = applied.get(filename);
    if (prev === checksum) continue;
    if (prev && prev !== checksum) {
      console.warn(`[${label}] WARN: ${filename} checksum drift — forward-only, not re-running. ` +
        `Create a new file to evolve the schema/data further.`);
      continue;
    }

    console.log(`[${label}] applying ${filename}`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        `INSERT INTO ${table} (filename, checksum) VALUES ($1,$2) ` +
        `ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW()`,
        [filename, checksum],
      );
      await client.query("COMMIT");
      newlyApplied++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[${label}] FAILED on ${filename}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  if (newlyApplied === 0) {
    console.log(`[${label}] up to date (${files.length} file${files.length === 1 ? "" : "s"} tracked)`);
  } else {
    console.log(`[${label}] applied ${newlyApplied} new / ${files.length} total`);
  }
};

export const runMigrations = () => applyDir(MIGRATIONS_DIR, "schema_migrations", "migrate");
export const runSeeds      = () => applyDir(SEEDS_DIR,      "schema_seeds",      "seed");
