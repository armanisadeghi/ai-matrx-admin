/**
 * One home: an agent's versions — the diff viewer, its field adapters, the comparison, the diff
 * constants, the promote failure sentence and the version timeline — live in @ai-matrx/agents
 * (`./versions`, `./versions/react`), shared with Matrx 2. The web keeps only thin bindings (its
 * ports: enrichment, identity refs, Redux snapshots, Duplicate, toasts). A second copy here fails.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..", "..", "..");
const AGENTS = join(ROOT, "features", "agents");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules") return [];
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const MOVED = [
  "components/diff/adapters",
  "components/diff/compare-agent-definitions.ts",
  "components/diff/agent-diff-constants.ts",
  "components/diff/promote-failure-message.ts",
];

describe("agent versions live in @ai-matrx/agents", () => {
  it("no moved module is back under features/agents", () => {
    expect(MOVED.filter((p) => existsSync(join(AGENTS, p)))).toEqual([]);
  });

  it("nothing under features/agents re-declares the adapter registry, the diff options, the timeline or the version doors", () => {
    const source = files(AGENTS).filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("__tests__"));
    const copies = source.filter((f) => {
      const text = readFileSync(f, "utf8");
      return (
        /registry\.register\(\s*"modelId"/.test(text) ||
        /export const AGENT_DIFF_OPTIONS\b/.test(text) ||
        /export function compareAgentDefinitions\b/.test(text) ||
        /<MatrxVersionTimeline\b/.test(text) ||
        /rpc\(\s*"agx_(promote_version|get_version_history|get_version_snapshot|declare_contract_break)"/.test(text)
      );
    });
    expect(copies.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it("the web's bindings take the viewer and the timeline from the package", () => {
    const viewer = readFileSync(join(AGENTS, "components/diff/AgentDiffViewer.tsx"), "utf8");
    const timeline = readFileSync(join(AGENTS, "components/diff/VersionHistoryTimeline.tsx"), "utf8");
    expect(viewer).toContain('from "@ai-matrx/agents/versions/react"');
    expect(timeline).toContain('from "@ai-matrx/agents/versions/react"');
  });
});
