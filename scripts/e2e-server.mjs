import { execFileSync, spawn } from "node:child_process";

const env = {
  ...process.env,
  DATABASE_URL: "file:./e2e.db",
  PORT: process.env.PORT ?? "3000",
};

execFileSync("node", ["scripts/prepare-test-db.mjs", "e2e"], {
  stdio: "inherit",
  env,
});

const server = spawn("next", ["dev", "-H", "127.0.0.1", "-p", env.PORT], {
  stdio: "inherit",
  env,
});

server.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGTERM", () => server.kill("SIGTERM"));
process.on("SIGINT", () => server.kill("SIGINT"));
