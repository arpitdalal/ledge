import { execFileSync } from "node:child_process";
import os from "node:os";
import { join } from "node:path";

function resolvePlaywrightHostOverride() {
  if (os.platform() !== "darwin") {
    return {};
  }

  const darwinMajor = Number.parseInt(os.release().split(".")[0] ?? "0", 10);
  const macMajor = Math.min(Math.max(darwinMajor - 9, 11), 15);
  const isArm64 = os.arch() === "arm64";

  return {
    PLAYWRIGHT_HOST_PLATFORM_OVERRIDE: `mac${macMajor}${isArm64 ? "-arm64" : ""}`,
  };
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/playwright.mjs <playwright-args...>");
  process.exit(1);
}

const playwrightBin = join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "playwright.cmd" : "playwright",
);

execFileSync(playwrightBin, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: "0",
    ...resolvePlaywrightHostOverride(),
  },
});
