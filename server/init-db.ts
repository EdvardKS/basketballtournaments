import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

export async function initDatabaseIfEmpty() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 🔍 comprobar si hay tablas en public
    const res = await pool.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
    `);

    const tableCount = Number(res.rows[0].count);

    if (tableCount > 0) {
      console.log(`[DB] Ya existen ${tableCount} tablas. No se inicializa.`);
      return;
    }

    console.log("[DB] Base de datos vacía. Ejecutando base_datos_cero.sql...");

    const sqlPath = path.join(
      process.cwd(),
      "server/sql/base_datos_cero.sql"
    );

    const sql = fs.readFileSync(sqlPath, "utf-8");

    await pool.query(sql);

    console.log("[DB] Base de datos inicializada correctamente ✅");
  } catch (err) {
    console.error("[DB] Error inicializando la base de datos ❌", err);
    throw err;
  } finally {
    await pool.end();
  }
}
