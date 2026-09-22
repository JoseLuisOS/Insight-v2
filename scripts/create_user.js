// scripts/create_user.js
// Provisions a Supabase Auth user for Intersel Insight (no public signup —
// accounts are admin-created). Sets a temporary password and
// app_metadata.must_change_password = true, so the person is forced to set
// their own password on first login (see src/app/change-password).
//
// Usage: node scripts/create_user.js <email> <temp-password>
//
// After running this, re-run scripts/004_iam_seed_hcv.sql if this email is
// the sysadmin bootstrap target — it looks up auth.users by email and was a
// no-op until this account existed.

const path = require("path");
process.loadEnvFile(path.resolve(__dirname, "..", ".env"));

const { createClient } = require("@supabase/supabase-js");

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/create_user.js <email> <temp-password>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // admin-provisioned — skip the confirmation email
    app_metadata: { must_change_password: true },
  });

  if (error) {
    console.error(`FAILED: ${error.message}`);
    process.exit(1);
  }

  console.log(`Created ${data.user.email} (id: ${data.user.id})`);
  console.log("must_change_password: true — will be prompted to set a real password on first login.");
})();
