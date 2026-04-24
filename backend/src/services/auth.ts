// Authentication logic. Identifier can be username (admins)
// or mobile number (players/captains). Passwords are plain text in
// seed data for dev; in prod switch to bcrypt (TODO).
import { HttpError } from "../middleware/error.js";
import { queryOne } from "../db/query.js";
import { toPlayer } from "../db/mappers.js";
import type { Player } from "../types.js";

const byIdentifier = `
  SELECT * FROM players
  WHERE username = $1 OR mobile = $1
  LIMIT 1
`;

export const authenticate = async (
  identifier: string, password: string,
): Promise<Player> => {
  const row = await queryOne(byIdentifier, [identifier]);
  if (!row) throw new HttpError(401, "INVALID_CREDENTIALS");
  if ((row.password as string | null) !== password) {
    throw new HttpError(401, "INVALID_CREDENTIALS");
  }
  return toPlayer(row);
};
