/**
 * GUARD — one microphone/camera device list.
 *
 * Only @ai-matrx/browser-audio (`listMediaDevices` / `watchMediaDevices`) may call
 * `mediaDevices.enumerateDevices()` or listen for `devicechange`. Everything else asks it.
 * Allow-list: none today; add a path here only with a reason a raw read is required.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "tests", "e2e", "docs", "scripts", ".git"]);
const ALLOW: Record<string, string> = {};

export function findViolations(root: string, allow: Record<string, string> = ALLOW): string[] {
  const hits: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.|\.d\.ts$|__tests__/.test(full)) {
        const rel = relative(root, full);
        if (rel in allow) continue;
        const text = readFileSync(full, "utf8");
        if (/\.enumerateDevices\s*\(|["']devicechange["']|\.ondevicechange/.test(text)) hits.push(rel);
      }
    }
  };
  walk(root);
  return hits;
}

describe("one device list", () => {
  it("no app file reads raw devices or listens for devicechange", () => {
    expect(findViolations(ROOT)).toEqual([]);
  });

  it("the scan catches a violation (self-test)", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const os = require("node:os") as typeof import("node:os");
    const dir = fs.mkdtempSync(join(os.tmpdir(), "devguard-"));
    fs.writeFileSync(join(dir, "bad.ts"), "await navigator.mediaDevices.enumerateDevices();");
    fs.writeFileSync(join(dir, "bad2.ts"), 'm.addEventListener("devicechange", f);');
    fs.writeFileSync(join(dir, "ok.ts"), "listMediaDevices();");
    expect(findViolations(dir).sort()).toEqual(["bad.ts", "bad2.ts"]);
  });
});
