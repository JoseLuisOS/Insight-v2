// scripts/run-sql.js
// Runs a .sql file against the Insight-v2 database.
// Usage: node scripts/run-sql.js <path/to/file.sql> [--admin]
//   (default) app connection (APP_DATABASE_URL, role insight_app).
//   --admin   reserved for DBA operations that require CENTRAL_DATABASE_URL,
//             such as creating roles or objects referencing auth.users.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

process.loadEnvFile(path.resolve(__dirname, '..', '.env'));

const file = process.argv[2];
const useAdmin = process.argv.includes('--admin');

if (!file || file.startsWith('--') || process.argv.slice(3).some((arg) => arg !== '--admin')) {
  console.error('Usage: node scripts/run-sql.js <path/to/file.sql> [--admin]');
  process.exit(1);
}

const connStr = useAdmin ? process.env.CENTRAL_DATABASE_URL : process.env.APP_DATABASE_URL;
if (!connStr) {
  console.error(`Missing ${useAdmin ? 'CENTRAL_DATABASE_URL' : 'APP_DATABASE_URL'} in .env`);
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf8');

(async () => {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const expectedRole = useAdmin ? 'postgres' : 'insight_app';
    const role = await client.query('select current_user');
    if (role.rows[0].current_user !== expectedRole) {
      throw new Error(`Expected database role ${expectedRole}, got ${role.rows[0].current_user}`);
    }
    const result = await client.query(sql);
    const results = Array.isArray(result) ? result : [result];
    for (const r of results) {
      if (r && r.rows && r.rows.length) console.table(r.rows);
    }
    console.log(`OK: ${file} (as ${expectedRole})`);
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(`FAILED: ${file}\n${e.message}`);
  process.exit(1);
});
