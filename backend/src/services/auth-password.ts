// Self-service password change. Requires the current password as a second
// factor to prevent session hijack from being enough to lock the account out.
// Passwords are bcrypt-hashed (with legacy plaintext fallback on verify).
import { z } from "zod";
import { queryOne } from "../db/query.js";
import { HttpError } from "../middleware/error.js";
import { verifyPassword, hashPassword } from "./password.js";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword: z.string().min(6).max(100),
  confirmPassword: z.string().min(6).max(100),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "PASSWORD_MISMATCH", path: ["confirmPassword"],
});

export const changePassword = async (playerId: string, raw: unknown) => {
  const data = changePasswordSchema.parse(raw);
  const row = await queryOne<{ password: string | null }>(
    "SELECT password FROM players WHERE id=$1", [playerId],
  );
  if (!row) throw new HttpError(404, "PLAYER_NOT_FOUND");
  if (!(await verifyPassword(data.currentPassword, row.password))) {
    throw new HttpError(403, "INVALID_CURRENT_PASSWORD");
  }
  await queryOne(
    "UPDATE players SET password=$2 WHERE id=$1 RETURNING id",
    [playerId, await hashPassword(data.newPassword)],
  );
};
