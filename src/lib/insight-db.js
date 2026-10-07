import "server-only";
import pg from "pg";
import { logDuration, logError, logEvent } from "./server-log";

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
      // Opening a remote TLS connection costs 1-3 s; keep idle ones between navigations.
      idleTimeoutMillis: Math.max(10000, Number.parseInt(process.env.INSIGHT_DB_IDLE_MS || (process.env.NODE_ENV === "development" ? "300000" : "60000"), 10) || 60000),
      keepAlive: true,
      connectionTimeoutMillis: 5000,
    });
    globalDb.__insightPool.on("error", (error) => {
      logError("Conexión SQL inactiva terminada", error);
    });
  }
  return globalDb.__insightPool;
}

/** Open a few pooled connections ahead of the first request; failures are logged, never thrown. */
export async function warmInsightDb(connections = 2) {
  if (!process.env.APP_DATABASE_URL && !process.env.APP_DATABASE_POOLER) return;
  const started = performance.now();
  try {
    const pool = insightDb();
    const clients = await Promise.all(Array.from({ length: Math.min(connections, pool.options.max) }, () => pool.connect()));
    clients.forEach((client) => client.release());
    await logEvent("INFO", "sql.warmup", { duration_ms: Math.round(performance.now() - started), connections: clients.length });
  } catch (error) {
    logError("Precalentamiento SQL fallido", error);
  }
}

/** Separate pool wait/connect time from PostgreSQL execution without logging SQL or parameters. */
export async function insightQuery(stage, statement, values = []) {
  const pool = insightDb();
  const acquireStarted = performance.now();
  let client;
  try {
    client = await pool.connect();
  } catch (error) {
    logError("Conexión SQL fallida", error, { stage, pool_total: pool.totalCount, pool_idle: pool.idleCount, pool_waiting: pool.waitingCount });
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
      logError("Consulta SQL fallida", error, { stage });
      throw error;
    }
    await logDuration(`${stage}.query`, queryStarted, { rows: result.rowCount ?? 0 });
    return result;
  } finally {
    client.release();
  }
}
