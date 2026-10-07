const { spawn } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const envFile = join(process.cwd(), ".env");
const configuredPort = existsSync(envFile)
  ? readFileSync(envFile, "utf8").match(/^PORT=(\d+)\s*$/m)?.[1]
  : undefined;
const port = process.env.PORT || configuredPort || "3000";
const caFile = process.env.CAROOT
  ? join(process.env.CAROOT, "rootCA.pem")
  : process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "mkcert", "rootCA.pem")
    : undefined;
const env = {
  ...process.env,
  PORT: port,
  WORKFLOW_LOCAL_BASE_URL: process.env.WORKFLOW_LOCAL_BASE_URL || `https://localhost:${port}`,
};

if (!env.NODE_EXTRA_CA_CERTS && caFile && existsSync(caFile)) env.NODE_EXTRA_CA_CERTS = caFile;

const bundlerArgs = process.env.INSIGHT_DEV_BUNDLER === "turbopack" ? [] : ["--webpack"];
const next = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...bundlerArgs, "--experimental-https", "--port", port], {
  env,
  stdio: "inherit",
});
next.on("error", (error) => { console.error(error); process.exitCode = 1; });
next.on("exit", (code) => { process.exitCode = code ?? 1; });
