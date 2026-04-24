// CLI wrapper for the migrations runner.
// Usage (inside backend container):
//   node dist/db/migrate-cli.js up        run pending migrations
//   node dist/db/migrate-cli.js status    show applied / pending / drift
//   node dist/db/migrate-cli.js mark <f>  mark a file as applied without running
//                                         (for legacy DBs bootstrapped out-of-band)
//
// Equivalent npm scripts in package.json: migrate, migrate:status, migrate:mark.

import { pool, waitForDb } from "./pool.js";
import { runMigrations, getStatus } from "./migrate.js";

const cmd = process.argv[2] ?? "up";

const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim    = (s: string) => `\x1b[2m${s}\x1b[0m`;

const printStatus = async () => {
  const rows = await getStatus();
  if (rows.length === 0) {
    console.log("No migration files found.");
    return;
  }
  console.log(`\n  ${"Status".padEnd(8)} ${"Filename".padEnd(40)} Applied at`);
  console.log(`  ${"-".repeat(8)} ${"-".repeat(40)} ${"-".repeat(20)}`);
  for (const r of rows) {
    const tag = r.drift ? yellow("DRIFT")
              : r.applied ? green("APPLIED")
              : red("PENDING");
    const at = r.appliedAt ? dim(new Date(r.appliedAt).toISOString().replace("T", " ").slice(0, 19)) : "";
    console.log(`  ${tag.padEnd(17)} ${r.filename.padEnd(40)} ${at}`);
  }
  const pending = rows.filter((r) => !r.applied).length;
  const drift   = rows.filter((r) => r.drift).length;
  console.log(`\n  ${rows.length} total · ${pending} pending · ${drift} drift\n`);
};

const markApplied = async (filename: string) => {
  const rows = await getStatus();
  const found = rows.find((r) => r.filename === filename);
  if (!found) {
    console.error(red(`No such migration file: ${filename}`));
    process.exit(1);
  }
  if (found.applied && !found.drift) {
    console.log(yellow(`${filename} already marked applied`));
    return;
  }
  await pool.query(
    "INSERT INTO schema_migrations (filename, checksum) VALUES ($1,$2) " +
    "ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW()",
    [filename, found.checksum],
  );
  console.log(green(`✓ ${filename} marked applied (without running)`));
};

(async () => {
  try {
    await waitForDb();
    switch (cmd) {
      case "up":
        await runMigrations();
        break;
      case "status":
        await printStatus();
        break;
      case "mark": {
        const f = process.argv[3];
        if (!f) { console.error("usage: migrate-cli mark <filename>"); process.exit(1); }
        await markApplied(f);
        break;
      }
      default:
        console.error(`Unknown command: ${cmd}. Use: up | status | mark <filename>`);
        process.exit(1);
    }
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
