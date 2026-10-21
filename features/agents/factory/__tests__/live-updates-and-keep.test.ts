/**
 * LANE 3B-FIX GUARDS. Each one is proven on the code it replaced: the old files come out of git
 * (`git show <commit>:<path>`, into a temp dir; nothing on disk is swapped) and are scanned by the same
 * function the live files are.
 *
 *  1. An OLD pipeline build that is still running keeps updating on its own event stream
 *     (`GET /runtime/executions/{id}/events/stream`), with no timer.
 *  2. The Factory list of old builds re-reads through the canonical realtime channel on the build rows
 *     (`runtime.global_execution`, type agent_factory_build), with no timer.
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
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function followsOldBuildOnItsEventStream(detailHook: string): boolean {
  const c = code(detailHook);
  return /operationEventsStream\s*\(/.test(c) && /execution_id/.test(c);
}
export function listFollowsBuildRows(page: string, hook: string | null): boolean {
  if (!/useFactoryBuildChanges\s*\(\s*reload\s*\)/.test(code(page))) return false;
  if (hook === null) return false;
  const h = code(hook);
  return /schema:\s*["']runtime["']/.test(h) && /table:\s*["']global_execution["']/.test(h) && /type=eq\.agent_factory_build/.test(h);
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

describe("the list of old builds re-reads when a build starts or changes", () => {
  it("is bound to runtime.global_execution (type agent_factory_build) through the realtime channel", () => {
    expect(listFollowsBuildRows(live("components/FactoryBuildsPage.tsx"), live("useFactoryBuildChanges.ts"))).toBe(true);
  });
  it("fails on the pre-fix page (no live feed at all)", () => {
    expect(listFollowsBuildRows(old("components/FactoryBuildsPage.tsx"), null)).toBe(false);
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
