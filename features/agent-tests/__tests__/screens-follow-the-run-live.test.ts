import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("test and battle screens ride the stream and realtime", () => {
  it("a migration puts both tables in the realtime publication", () => {
    const dir = path.join(ROOT, "migrations");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const files = (require("node:fs") as typeof import("node:fs")).readdirSync(dir).filter((f) => f.endsWith("agent_tests_realtime_publication.sql"));
    expect(files).toHaveLength(1);
    const sql = read(`migrations/${files[0]}`);
    expect(sql).toMatch(/'test_run'/);
    expect(sql).toMatch(/'test_result'/);
    expect(sql).toMatch(/alter publication supabase_realtime add table agent\./);
    expect(sql.split("\n")[0]).not.toMatch(/^-- draft:/);
  });

  it("the run hook binds both tables with literal names (so check:realtime-publication names them)", () => {
    const src = read("features/agent-tests/useRunChanges.ts");
    expect(src).toMatch(/schema: "agent",\s*table: "test_run"/);
    expect(src).toMatch(/schema: "agent",\s*table: "test_result"/);
  });

  it("launch is the stream door and nothing else, and no screen polls", () => {
    const service = read("features/agent-tests/service.ts");
    expect(service).toContain("startLiveRun");
    expect(service).not.toContain("followRun");
    expect(service).not.toContain("/stream");
    expect(read("features/agent-tests/liveRun.ts")).toContain("/agent-tests/runs/live");
    for (const f of [
      "features/agent-tests/components/AgentTestPage.tsx",
      "features/agents/studio/components/StudioBattle.tsx",
      "features/agents/studio/components/StudioCases.tsx",
    ]) {
      expect(read(f)).not.toMatch(/setInterval\(/);
    }
  });

  it("the battle reads its default runs per case through the session knob, and shows verdicts live", () => {
    const src = read("features/agents/studio/components/StudioBattle.tsx");
    expect(src).toContain('useSessionKnob("agent_tests.battle_repeats")');
    expect(src).not.toMatch(/feature_knob/);
    expect(src).toContain("useRunChanges");
    // Nothing is swallowed.
    expect(src).not.toMatch(/\.catch\(\(\) =>/);
    expect(src).not.toMatch(/catch \{/);
  });
});
