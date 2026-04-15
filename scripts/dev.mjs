import { execFileSync, spawn } from "node:child_process";
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
} from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
}

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2];
  }
}

const run = (command, args, options = {}) => {
  execFileSync(command, args, { stdio: "inherit", ...options });
};

function ensureSqliteFile(databaseUrl) {
  if (!databaseUrl?.startsWith("file:")) return;

  const sqlitePath = databaseUrl.replace(/^file:/, "");
  if (sqlitePath === ":memory:") return;

  const resolvedPath = isAbsolute(sqlitePath)
    ? sqlitePath
    : join("prisma", sqlitePath);
  mkdirSync(dirname(resolvedPath), { recursive: true });

  if (!existsSync(resolvedPath)) {
    closeSync(openSync(resolvedPath, "w"));
  }
}

ensureSqliteFile(process.env.DATABASE_URL);
run("prisma", ["generate"]);
run("prisma", ["migrate", "deploy"]);

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const workspaceCount = await prisma.workspace.count();
await prisma.$disconnect();

if (workspaceCount === 0) {
  run("prisma", ["db", "seed"]);
}

const server = spawn("next", ["dev"], {
  stdio: "inherit",
  env: process.env,
});

server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

process.on("SIGTERM", () => server.kill("SIGTERM"));
process.on("SIGINT", () => server.kill("SIGINT"));
