/**
 * LANE 3B-FIX GUARDS. Each one is proven on the code it replaced: the old files come out of git
 * (`git show <commit>:<path>`, into a temp dir; nothing on disk is swapped) and are scanned by the same
 * function the live files are.
 *
 *  1. An OLD pipeline build that is still running keeps updating on its own event stream
 *     (`GET /runtime/executions/{id}/events/stream`), with no timer.
 *  2. The Factory list of old builds never subscribes to `runtime.global_execution` (lane 3B-revert: the
 *     table left the realtime publication; the list keeps Refresh, focus and reconnect re-reads).
 *  3. The client never writes `agent.definition` from the build view: "Keep it anyway" goes through the
 *     server's keep door (which updates the agent through the agent service and marks it unproven).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..", "..");
const FACTORY = "features/agents/factory";
/** Lane 3B as first pushed: the build view that lost the old builds' live updates and wrote the agent directly. */
const OLD = "0615eaa4f6";

function live(file: string): string {
  return readFileSync(join(ROOT, FACTORY, file), "utf8");
}
/** The pre-fix file, out of git, through a temp dir. */
function old(file: string): string {
  const text = execFileSync("git", ["show", `${OLD}:${FACTORY}/${file}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 20_000_000 });
  const dir = mkdtempSync(join(tmpdir(), "factory-3b-old-"));
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), text);
  return readFileSync(join(dir, file), "utf8");
}
/** The lane 3B-fix commit that added the list's live feed. */
const FEED_COMMIT = "3e9c78b4ab";
function oldAt(commit: string, file: string): string {
  const text = execFileSync("git", ["show", `${commit}:${FACTORY}/${file}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 20_000_000 });
  const dir = mkdtempSync(join(tmpdir(), "factory-3b-feed-"));
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), text);
  return readFileSync(join(dir, file), "utf8");
}
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function followsOldBuildOnItsEventStream(detailHook: string): boolean {
  const c = code(detailHook);
  return /operationEventsStream\s*\(/.test(c) && /execution_id/.test(c);
}
/** True when anything under features/agents/factory opens a realtime channel on global_execution. */
export function subscribesToGlobalExecution(files: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [path, text] of Object.entries(files)) {
    const c = code(text);
    if (/useChannel\s*\(|postgresChanges|\.channel\s*\(/.test(c) && /global_execution/.test(c)) out.push(path);
    if (/useFactoryBuildChanges/.test(c)) out.push(`${path}: useFactoryBuildChanges`);
  }
  return out;
}
export function writesAgentDefinition(source: string): boolean {
  const c = code(source);
  return /["']agent["']\s*\)\s*\.from\(\s*["']definition["']\s*\)\s*\.update\(/s.test(c);
}

describe("an old build that is still running updates live, without a timer", () => {
  it("follows the build's execution event stream", () => {
    expect(followsOldBuildOnItsEventStream(live("useBuildDetail.ts"))).toBe(true);
  });
  it("fails on the pre-fix hook (focus and reload only)", () => {
    expect(followsOldBuildOnItsEventStream(old("useBuildDetail.ts"))).toBe(false);
  });
});

describe("the list of old builds never subscribes to runtime.global_execution", () => {
  const LIST_FILES = ["components/FactoryBuildsPage.tsx", "useFactoryBuildChanges.ts"];
  it("has no realtime binding on global_execution (it is not in the publication; Refresh, focus and reconnect re-read)", () => {
    const files: Record<string, string> = {};
    for (const f of ["components/FactoryBuildsPage.tsx", "service.ts", "useBuildDetail.ts", "components/BuildProgress.tsx"]) files[f] = live(f);
    expect(subscribesToGlobalExecution(files)).toEqual([]);
  });
  it("keeps the list's Refresh button", () => {
    expect(code(live("components/FactoryBuildsPage.tsx"))).toMatch(/refresh:\s*\{\s*onRefresh:\s*reload/);
  });
  it("fails on the code that had the live feed (lane 3B-fix, out of git)", () => {
    const files: Record<string, string> = {};
    for (const f of LIST_FILES) files[f] = oldAt(FEED_COMMIT, f);
    expect(subscribesToGlobalExecution(files).length).toBeGreaterThan(0);
  });
});

describe("the build view never writes agent.definition from the client", () => {
  it("has no agent.definition update in features/agents/factory", () => {
    for (const f of ["build-run-service.ts", "service.ts", "useBuildDetail.ts", "components/BuildProgress.tsx"]) {
      expect(`${f}:${writesAgentDefinition(live(f))}`).toBe(`${f}:false`);
    }
  });
  it("fails on the pre-fix build-run-service (the direct un-archive)", () => {
    expect(writesAgentDefinition(old("build-run-service.ts"))).toBe(true);
  });
  it("keeps through the server's keep door, by build id", () => {
    const service = code(live("service.ts"));
    expect(service).toMatch(/keepBuild\(\s*serverApi\s*,\s*\{\s*path:\s*\{\s*build_id:\s*buildId/);
    expect(code(live("components/BuildProgress.tsx"))).toMatch(/keepBuildAnyway\(\s*currentId\s*\)/);
  });
});
