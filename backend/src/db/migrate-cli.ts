// CLI wrapper for migrations + seed runner.
// Usage inside the backend container:
//   npm run migrate               apply pending migrations
//   npm run migrate:status        show migrations + seeds status
//   npm run seed                  apply pending seeds
//   npm run migrate:mark <f>      mark a migration as applied w/o running
//   npm run seed:mark <f>         mark a seed as applied w/o running
//
// Delegates to the pair of exports in ./migrate.ts.

import { pool, waitForDb } from "./pool.js";
import { runMigrations, runSeeds, getStatus, type FileStatus } from "./migrate.js";

const cmd = process.argv[2] ?? "migrate:up";
const arg = process.argv[3];

const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim    = (s: string) => `\x1b[2m${s}\x1b[0m`;

const printSection = (title: string, rows: FileStatus[]) => {
  console.log(`\n  ${cyan(title)}`);
  if (rows.length === 0) {
    console.log(`  ${dim("(no files)")}`);
    return;
  }
  console.log(`  ${"Status".padEnd(8)} ${"Filename".padEnd(40)} Applied at`);
  console.log(`  ${"-".repeat(8)} ${"-".repeat(40)} ${"-".repeat(19)}`);
  for (const r of rows) {
    const tag = r.drift ? yellow("DRIFT")
              : r.applied ? green("APPLIED")
              : red("PENDING");
    const at = r.appliedAt
      ? dim(new Date(r.appliedAt).toISOString().replace("T", " ").slice(0, 19))
      : "";
    console.log(`  ${tag.padEnd(17)} ${r.filename.padEnd(40)} ${at}`);
  }
  const pending = rows.filter((r) => !r.applied).length;
  const drift   = rows.filter((r) => r.drift).length;
  console.log(`  ${rows.length} total · ${pending} pending · ${drift} drift`);
};

const printStatus = async () => {
  const [mig, seed] = await Promise.all([getStatus("migration"), getStatus("seed")]);
  printSection("Migrations (db/init/)", mig);
  printSection("Seeds (db/seeds/)", seed);
  console.log("");
};

const markApplied = async (kind: "migration" | "seed", filename: string) => {
  const rows = await getStatus(kind);
  const found = rows.find((r) => r.filename === filename);
  if (!found) {
    console.error(red(`No such ${kind} file: ${filename}`));
    process.exit(1);
  }
  const table = kind === "migration" ? "schema_migrations" : "schema_seeds";
  await pool.query(
    `INSERT INTO ${table} (filename, checksum) VALUES ($1,$2) ` +
    `ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW()`,
    [filename, found.checksum],
  );
  console.log(green(`✓ ${kind} ${filename} marked applied (without running)`));
};

(async () => {
  try {
    await waitForDb();
    switch (cmd) {
      case "migrate:up":
      case "up":
        await runMigrations();
        break;
      case "seed:up":
      case "seed":
        await runSeeds();
        break;
      case "status":
        await printStatus();
        break;
      case "migrate:mark":
        if (!arg) { console.error("usage: migrate-cli migrate:mark <filename>"); process.exit(1); }
        await markApplied("migration", arg);
        break;
      case "seed:mark":
        if (!arg) { console.error("usage: migrate-cli seed:mark <filename>"); process.exit(1); }
        await markApplied("seed", arg);
        break;
      default:
        console.error(`Unknown command: ${cmd}.`);
        console.error("Available: migrate:up | seed:up | status | migrate:mark <f> | seed:mark <f>");
        process.exit(1);
    }
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
