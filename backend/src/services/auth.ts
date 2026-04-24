// Authentication: verify credentials and return the player record.
import { queryOne } from "../db/query.js";
import { toPlayer } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";

// Players/captains log in with mobile; admins log in with username.
export const authenticate = async (identifier: string, password: string) => {
  const row = await queryOne(
    `SELECT * FROM players
     WHERE (mobile = $1 OR username = $1) AND password = $2`,
    [identifier.trim(), password],
  );
  if (!row) throw new HttpError(401, "INVALID_CREDENTIALS");
  return toPlayer(row);
};
