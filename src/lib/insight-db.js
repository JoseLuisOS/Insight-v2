import "server-only";
import pg from "pg";
import { logDuration, logError } from "./server-log";

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
      max: Math.min(10, Math.max(1, Number.parseInt(process.env.INSIGHT_DB_POOL_MAX || (process.env.NODE_ENV === "development" ? "4" : "2"), 10) || 2)),
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 5000,
    });
    globalDb.__insightPool.on("error", (error) => {
      logError("Conexión SQL inactiva terminada", error);
    });
  }
  return globalDb.__insightPool;
}

/** Separate pool wait/connect time from PostgreSQL execution without logging SQL or parameters. */
export async function insightQuery(stage, statement, values = []) {
  const pool = insightDb();
  const acquireStarted = performance.now();
  let client;
  try {
    client = await pool.connect();
  } catch (error) {
    logError(`Conexión SQL fallida en ${stage} (total=${pool.totalCount}, idle=${pool.idleCount}, waiting=${pool.waitingCount})`, error);
    throw error;
  }
  try {
    await logDuration(`${stage}.acquire`, acquireStarted, {
      pool_total: pool.totalCount, pool_idle: pool.idleCount, pool_waiting: pool.waitingCount,
    });
    const queryStarted = performance.now();
    let result;
    try {
      result = await client.query(statement, values);
    } catch (error) {
      logError(`Consulta SQL fallida en ${stage}`, error);
      throw error;
    }
    await logDuration(`${stage}.query`, queryStarted, { rows: result.rowCount ?? 0 });
    return result;
  } finally {
    client.release();
  }
}
