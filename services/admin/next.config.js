/** @type {import('next').NextConfig} */
const path = require("path");
const fs = require("fs");

// Next 14 has no `envDir`. Workspace `next dev` cwd is services/admin, so
// Next would only load services/admin/.env. Load the repo-root file instead
// (same contract as viber/ai via resolveRootEnvPath). Existing process.env wins.
const rootEnv = path.resolve(__dirname, "../../.env");
if (fs.existsSync(rootEnv)) {
  require("dotenv").config({ path: rootEnv });
}

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

module.exports = nextConfig;
