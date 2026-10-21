/**
 * Guard: Watch AI never polls data. Its live updates ride `chat.user_request` realtime
 * (`useUserRequestChanges`); a timer that re-reads rows is the defect this refuses.
 *
 * Refused in `features/ai-watch/**`: `setInterval`, and a `setTimeout` that re-arms a read
 * (`setTimeout(tick|load|poll|refresh...)`). Allowed: AutoWatch's layout timer (it reads a local
 * measurement, no network) and the bounded one-shot fold in `useUserRequestChanges`.
 * Written to fail on the code before the realtime move: it had `setInterval(load…)`,
 * `setTimeout(tick, POLL_MS)` and `setTimeout(load, FOLLOW_READ_MS)`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const LAYOUT_TIMER_FILES = new Set(["AutoWatch.tsx"]);
const POLL_PATTERNS: Array<[string, RegExp]> = [
  ["setInterval", /\bsetInterval\s*\(/],
  ["re-armed setTimeout read", /\bsetTimeout\s*\(\s*(?:tick|load|poll|refresh|fetch\w*|read\w*)\b/],
  ["poll interval constant", /\b(?:POLL|REFRESH|FOLLOW_READ)_MS\b/],
];

export function findDataPolls(file: string, source: string): string[] {
  if (LAYOUT_TIMER_FILES.has(file.split("/").pop() ?? "")) return [];
  const found: string[] = [];
  source.split("\n").forEach((line, i) => {
    if (/^\s*(\*|\/\/)/.test(line)) return;
    for (const [name, re] of POLL_PATTERNS) if (re.test(line)) found.push(`${file}:${i + 1} ${name}: ${line.trim()}`);
  });
  return found;
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === "__tests__" || name === "node_modules") return [];
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("Watch AI does not poll data", () => {
  it("has no setInterval or re-armed read timer in features/ai-watch", () => {
    const found = sources(ROOT).flatMap((f) => findDataPolls(relative(ROOT, f), readFileSync(f, "utf8")));
    expect(found).toEqual([]);
  });

  it("the scan catches the old poll shapes", () => {
    expect(findDataPolls("a.tsx", "const timer = setInterval(load, anyLive ? 1500 : 5000);")).toHaveLength(1);
    expect(findDataPolls("a.tsx", "if (pending) timer = setTimeout(tick, POLL_MS);").length).toBeGreaterThan(0);
    expect(findDataPolls("a.tsx", "if (!settled && more) setTimeout(load, FOLLOW_READ_MS);").length).toBeGreaterThan(0);
    expect(findDataPolls("AutoWatch.tsx", "window.setInterval(() => setRoom(autoOpenHasRoom()), 1000);")).toEqual([]);
  });
});
