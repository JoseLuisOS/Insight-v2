// scripts/provision_avatars_bucket.js
// Creates the public "avatars" Storage bucket (idempotent). Access control
// itself lives in scripts/009_storage_avatars_policies.sql — this script
// only creates the bucket if missing.
const path = require("path");
process.loadEnvFile(path.resolve(__dirname, "..", ".env"));

const { createClient } = require("@supabase/supabase-js");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

(async () => {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    console.error(`FAILED: ${listError.message}`);
    process.exit(1);
  }

  if (buckets.find((b) => b.name === "avatars")) {
    console.log("Bucket 'avatars' already exists.");
    return;
  }

  const { error } = await admin.storage.createBucket("avatars", {
    public: true,
    fileSizeLimit: "2MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });

  if (error) {
    console.error(`FAILED: ${error.message}`);
    process.exit(1);
  }

  console.log("Created bucket 'avatars' (public, 2MB limit, png/jpeg/webp only).");
})();
