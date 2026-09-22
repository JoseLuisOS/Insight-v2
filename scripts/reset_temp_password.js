// scripts/reset_temp_password.js
// Resets an EXISTING Supabase Auth user's password to a temporary one and
// re-sets app_metadata.must_change_password = true — for testing the forced
// password-change flow again without recreating the account (create_user.js
// is for brand-new accounts only; this is the "reset an existing one" case).
//
// Usage: node scripts/reset_temp_password.js <email> <temp-password>

const path = require("path");
process.loadEnvFile(path.resolve(__dirname, "..", ".env"));

const { createClient } = require("@supabase/supabase-js");

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/reset_temp_password.js <email> <temp-password>");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

(async () => {
  const { data: found, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error(`FAILED: ${listError.message}`);
    process.exit(1);
  }
  const user = found.users.find((u) => u.email === email);
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    app_metadata: { ...user.app_metadata, must_change_password: true },
  });

  if (error) {
    console.error(`FAILED: ${error.message}`);
    process.exit(1);
  }

  console.log(`Reset ${email} (id: ${user.id}) to the temporary password.`);
  console.log("must_change_password: true — will be prompted to set a real password on next login.");
})();
