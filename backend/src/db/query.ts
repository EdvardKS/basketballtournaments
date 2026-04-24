// Thin typed helpers around the pg pool. Everything returns plain objects.
import { pool } from "./pool.js";

export const query = async <T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> => {
  const res = await pool.query(text, params as unknown[]);
  return res.rows as T[];
};

export const queryOne = async <T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> => {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
};

export const tx = async <T>(
  fn: (q: typeof query) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const localQuery = async <R>(text: string, params: unknown[] = []) => {
      const res = await client.query(text, params as unknown[]);
      return res.rows as R[];
    };
    const result = await fn(localQuery as typeof query);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
