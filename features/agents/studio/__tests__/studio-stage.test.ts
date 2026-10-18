import { studioStage } from "../studio-stage";

const base: { making: boolean; buildId: string | null; agentId: string | null; runOpen: boolean } = {
  making: false,
  buildId: null,
  agentId: null,
  runOpen: false,
};

describe("studio stage", () => {
  it("Do it together walks Get a result -> Make it an agent -> Test & improve", () => {
    const at = (p: Partial<typeof base>) => studioStage({ mode: "do-with-me", ...base, ...p });
    expect(at({}).steps.map((s) => s.label)).toEqual(["Get a result", "Make it an agent", "Test & improve"]);
    expect(at({}).current).toBe(0);
    expect(at({ making: true }).current).toBe(1);
    expect(at({ buildId: "b" }).current).toBe(1);
    expect(at({ buildId: "b", agentId: "a" }).current).toBe(2);
  });
  it("every way in ends at Test & improve", () => {
    for (const mode of ["describe", "from-examples", "improve", "from-claude-account", "with-claude-code"] as const) {
      const s = studioStage({ mode, ...base, agentId: "a", runOpen: true });
      expect(s.steps).toHaveLength(3);
      expect(s.steps[2]?.label).toBe("Test & improve");
      expect(s.current).toBe(2);
    }
  });
  it("Improve waits on the run before testing", () => {
    expect(studioStage({ mode: "improve", ...base }).current).toBe(0);
    expect(studioStage({ mode: "improve", ...base, agentId: "a" }).current).toBe(1);
  });
});
