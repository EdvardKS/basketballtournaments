// Per-tournament photo gallery. Admin uploads images (base64) which appear
// in the public gallery alongside the legacy hardcoded photos.
import { z } from "zod";
import { query, queryOne } from "../db/query.js";
import { HttpError } from "../middleware/error.js";

export interface TournamentPhoto {
  id: string; tournamentId: string;
  image: string; caption: string | null;
  uploadedBy: string | null; uploadedAt: string;
}

const toIso = (v: unknown): string =>
  v == null ? "" : v instanceof Date ? v.toISOString() : String(v);

const photoSchema = z.object({
  image: z.string().min(20).max(2_000_000),  // ~2 MB cap for base64
  caption: z.string().max(280).optional().nullable(),
});

const toPhoto = (r: Record<string, unknown>): TournamentPhoto => ({
  id: r.id as string,
  tournamentId: r.tournament_id as string,
  image: r.image as string,
  caption: (r.caption as string | null) ?? null,
  uploadedBy: (r.uploaded_by as string | null) ?? null,
  uploadedAt: toIso(r.uploaded_at),
});

export const listPhotos = async (tournamentId: string) => {
  const rows = await query(
    "SELECT * FROM tournament_photos WHERE tournament_id=$1 ORDER BY uploaded_at DESC",
    [tournamentId],
  );
  return rows.map(toPhoto);
};

export const uploadPhoto = async (
  tournamentId: string, uploaderId: string, raw: unknown,
) => {
  const data = photoSchema.parse(raw);
  const exists = await queryOne(
    "SELECT id FROM tournaments WHERE id=$1", [tournamentId],
  );
  if (!exists) throw new HttpError(404, "TOURNAMENT_NOT_FOUND");
  const row = await queryOne(
    `INSERT INTO tournament_photos (tournament_id, image, caption, uploaded_by)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [tournamentId, data.image, data.caption ?? null, uploaderId],
  );
  return toPhoto(row!);
};

export const deletePhoto = async (photoId: string) => {
  const row = await queryOne(
    "DELETE FROM tournament_photos WHERE id=$1 RETURNING id", [photoId],
  );
  if (!row) throw new HttpError(404, "PHOTO_NOT_FOUND");
};
