// Ensures a production admin user exists, regardless of EXAMPLE_DATA. Reads
// credentials from env vars so secrets stay out of git. Idempotent: every
// boot performs an UPSERT on the username, so changing BOOTSTRAP_ADMIN_PASSWORD
// in the .env.prod and restarting the backend rotates the password in DB too.
//
// Skipped silently when the env vars are not set — useful for dev where the
// EXAMPLE_DATA seeds already provide admins.
import { queryOne } from "./query.js";

export const bootstrapAdmin = async (): Promise<void> => {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();

  if (!username || !password) {
    console.log("[bootstrap-admin] BOOTSTRAP_ADMIN_USERNAME / BOOTSTRAP_ADMIN_PASSWORD not set — skipping");
    return;
  }

  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || `Admin ${username}`;
  // The mobile column is NOT NULL UNIQUE. We default to a username-derived
  // synthetic value (not a real phone) so it's stable across restarts and
  // can't collide with real registrations. Users still log in with the
  // username, since auth queries (mobile = $1 OR username = $1).
  const mobile = process.env.BOOTSTRAP_ADMIN_MOBILE?.trim() || `admin:${username}`;

  await queryOne(
    `INSERT INTO players (name, mobile, username, role, password, is_public)
     VALUES ($1, $2, $3, 'admin', $4, false)
     ON CONFLICT (username) DO UPDATE SET
       name     = EXCLUDED.name,
       mobile   = EXCLUDED.mobile,
       role     = 'admin',
       password = EXCLUDED.password
     RETURNING id`,
    [name, mobile, username, password],
  );
  console.log(`[bootstrap-admin] ensured admin user "${username}"`);
};
