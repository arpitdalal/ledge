import { execFileSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, join } from "node:path";

const dbName = process.argv[2] === "e2e" ? "e2e.db" : "test.db";
const dbPath = join("prisma", dbName);

mkdirSync(dirname(dbPath), { recursive: true });
if (!existsSync(dbPath)) {
  closeSync(openSync(dbPath, "w"));
}

execFileSync("prisma", ["generate"], { stdio: "inherit" });
execFileSync("prisma", ["db", "push", "--force-reset", "--skip-generate"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: `file:./${dbName}`,
  },
});

if (process.argv[2] === "e2e") {
  execFileSync("prisma", ["db", "seed"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "file:./e2e.db",
    },
  });
}
