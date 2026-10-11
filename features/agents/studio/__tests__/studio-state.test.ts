import { CHAT_CASE_SOURCE, buildNameFrom, readStudioState, studioCaseFromBuild, studioHref } from "../studio-state";
import { STUDIO_MODES, studioMode } from "../modes";
import { COMING_SOON } from "@/lib/coming-soon/registry";
import type { FactoryBuildState } from "@/features/agents/factory/types";

describe("Agent Studio state", () => {
  it("round-trips the page state through its URL (a reload resumes)", () => {
    const all = { mode: "describe", buildId: "b1", agentId: "a1", chatId: "c1", planId: "n1", planStep: "2" };
    const href = studioHref(all);
    expect(readStudioState(new URL(href, "http://x").searchParams)).toEqual(all);
    expect(studioHref({})).toBe("/agents/new/studio");
  });

  it("reads the original request and the approved answer back from the build record", () => {
    const state: FactoryBuildState = {
      request: {
        spec: {
          sample_inputs: JSON.stringify([
            { variables: { practice_name: "Harbor Dental", visits: 3 }, baseline_output: "Hi there", source: CHAT_CASE_SOURCE, turn: 1 },
            "an extra example",
          ]),
        },
      },
    };
    expect(studioCaseFromBuild(state)).toEqual({
      variables: { practice_name: "Harbor Dental" },
      userInput: "",
      approved: "Hi there",
    });
    expect(studioCaseFromBuild({ request: { spec: { sample_inputs: "not json" } } })).toBeNull();
    expect(studioCaseFromBuild(null)).toBeNull();
  });

  it("names a build from the person's words without a trailing joiner", () => {
    expect(buildNameFrom("Write the weekly report for my")).toBe("write_the_weekly_report");
    expect(buildNameFrom("   ")).toBe("new_agent");
  });

  it("only built modes open; every placeholder is a registered Coming Soon promise", () => {
    expect(studioMode("describe")?.id).toBe("describe");
    expect(studioMode("do-with-me")?.id).toBe("do-with-me");
    for (const mode of STUDIO_MODES.filter((m) => m.comingSoonId)) {
      expect(studioMode(mode.id)).toBeNull();
      expect(COMING_SOON[mode.comingSoonId!]).toBeDefined();
    }
    // Bring-over modes are their own pages: a card, never a workspace mode.
    for (const mode of STUDIO_MODES.filter((m) => m.href)) expect(studioMode(mode.id)).toBeNull();
    expect(STUDIO_MODES.map((m) => m.id)).toEqual(
      expect.arrayContaining(["improve", "from-examples", "from-claude-account", "with-claude-code"]),
    );
  });
});
