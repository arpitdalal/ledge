import { execFileSync } from "node:child_process";
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

const run = (command, args) => {
  execFileSync(command, args, { stdio: "inherit" });
};

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2];
  }
}

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
run("prisma", ["db", "seed"]);
