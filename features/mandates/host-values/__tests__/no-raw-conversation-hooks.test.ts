/**
 * GUARD: a feature never registers conversation hooks itself. Values a place
 * hands a mandate run go through the host-values channel
 * (features/mandates/host-values), which owns the one `registerConversationHooks`
 * call. Proven RED on the old StudioRun.tsx, which registered its own gate and
 * double-owned the turn (Lane 1B, 2026-10-21).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../../..");
const FEATURES = path.join(ROOT, "features");
const ALLOWED = path.join("features", "mandates", "host-values") + path.sep;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "__tests__" || name === "node_modules") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("no raw conversation hooks in features", () => {
  it("registerConversationHooks appears only inside features/mandates/host-values", () => {
    const offenders = walk(FEATURES)
      .map((f) => path.relative(ROOT, f))
      .filter((rel) => !rel.startsWith(ALLOWED))
      .filter((rel) => readFileSync(path.join(ROOT, rel), "utf8").includes("registerConversationHooks"));
    expect(offenders).toEqual([]);
  });
});
