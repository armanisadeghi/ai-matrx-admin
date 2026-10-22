import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Lane 4A step (c): the in-process Matrix Battle doors (`/agent-battles/{id}/run`, `/cancel`), the
 * test-run NDJSON stream (`/agent-tests/runs/{id}/stream`) and the `/agent-testing` router are
 * deleted on the server. Nothing in the app may call them; the battle runs on `/queue-run` and
 * `/queue-cancel`.
 */
const ROOT = path.resolve(__dirname, "../../../../..");
const SKIP = new Set(["node_modules", ".next", ".git", "__tests__", "generated", "docs"]);

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sources(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

/** The installed `@ai-matrx/api` schema: does it carry the queue routes yet? */
const SCHEMA = readFileSync(require.resolve("@ai-matrx/api/types").replace(/\.c?js$/, ".d.ts"), "utf8");
const SCHEMA_HAS_QUEUE_RUN = SCHEMA.includes('"/agent-battles/{set_id}/queue-run"');
/** The paid-door census can only name a route the installed schema has; until it carries `queue-run`
 * it still names `/run` (see the comment there). The day it does, this file is scanned like any other. */
const PENDING_SCHEMA = SCHEMA_HAS_QUEUE_RUN ? [] : ["features/entitlements/usage-gate/paidAiPaths.ts"];

const RETIRED = [
  /agent-battles\/(?:\{[a-z_]+\}|[^"'`\s/]+)\/(?:run|cancel)\b(?!-)/,
  /agent-tests\/runs\/(?:\{[a-z_]+\}|[^"'`\s/]+)\/stream\b/,
  /["'`/]agent-testing\//,
];

describe("the retired battle and test-run doors have no callers", () => {
  const files = ["features", "lib", "app", "components", "hooks"].flatMap((d) => {
    try {
      return sources(path.join(ROOT, d));
    } catch {
      return [];
    }
  });

  it("scans real source files", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("no source names a retired route", () => {
    const hits = files.flatMap((f) => {
      if (PENDING_SCHEMA.includes(path.relative(ROOT, f))) return [];
      const text = readFileSync(f, "utf8");
      return RETIRED.filter((re) => re.test(text)).map(() => path.relative(ROOT, f));
    });
    expect(hits).toEqual([]);
  });

  it("the matrix doors are the queue doors", () => {
    const svc = readFileSync(path.join(ROOT, "features/agent-comparison/modes/matrix/service.ts"), "utf8");
    expect(svc).toContain('"/agent-battles/{set_id}/queue-run"');
    expect(svc).toContain('"/agent-battles/{set_id}/queue-cancel"');
  });

  it("the guard itself can fail: it matches the retired spellings and not the queue doors", () => {
    expect(RETIRED.some((re) => re.test("/agent-battles/{set_id}/run"))).toBe(true);
    expect(RETIRED.some((re) => re.test("/agent-battles/abc/cancel"))).toBe(true);
    expect(RETIRED.some((re) => re.test("/agent-tests/runs/{run_id}/stream"))).toBe(true);
    expect(RETIRED.some((re) => re.test("/agent-testing/agents/{agent_id}/tests"))).toBe(true);
    expect(RETIRED.some((re) => re.test("/agent-battles/{set_id}/queue-run"))).toBe(false);
    expect(RETIRED.some((re) => re.test("/agent-tests/runs/live"))).toBe(false);
  });
});
