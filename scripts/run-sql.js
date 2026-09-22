// scripts/run-sql.js
// Runs a .sql file against the Insight-v2 database.
// Usage: node scripts/run-sql.js <path/to/file.sql> [--app]
//   (default) admin connection (CENTRAL_DATABASE_URL) — required for DDL
//   that references auth.users (see docs/ARQUITECTURA.md §1).
//   --app      app connection (APP_DATABASE_URL, role intersel_insight_app)
//   — use for anything that doesn't touch auth.users.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

process.loadEnvFile(path.resolve(__dirname, '..', '.env'));

const file = process.argv[2];
const useApp = process.argv.includes('--app');

if (!file) {
  console.error('Usage: node scripts/run-sql.js <path/to/file.sql> [--app]');
  process.exit(1);
}

const connStr = useApp ? process.env.APP_DATABASE_URL : process.env.CENTRAL_DATABASE_URL;
if (!connStr) {
  console.error(`Missing ${useApp ? 'APP_DATABASE_URL' : 'CENTRAL_DATABASE_URL'} in .env`);
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf8');

(async () => {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(sql);
    const results = Array.isArray(result) ? result : [result];
    for (const r of results) {
      if (r && r.rows && r.rows.length) console.table(r.rows);
    }
    console.log(`OK: ${file} (as ${useApp ? 'intersel_insight_app' : 'postgres'})`);
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(`FAILED: ${file}\n${e.message}`);
  process.exit(1);
});
