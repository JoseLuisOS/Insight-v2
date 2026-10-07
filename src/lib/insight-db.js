import "server-only";
import pg from "pg";

const globalDb = globalThis;

export function insightDb() {
  if (!globalDb.__insightPool) {
    const connectionString = process.env.NODE_ENV === "development"
      ? (process.env.APP_DATABASE_URL || process.env.APP_DATABASE_POOLER)
      : (process.env.APP_DATABASE_POOLER || process.env.APP_DATABASE_URL);
    if (!connectionString) throw new Error("Falta la conexión APP_DATABASE_POOLER/APP_DATABASE_URL");
    globalDb.__insightPool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
  }
  return globalDb.__insightPool;
}
