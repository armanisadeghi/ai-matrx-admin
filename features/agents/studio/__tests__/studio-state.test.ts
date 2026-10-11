import {
  CHAT_CASE_SOURCE,
  EXAMPLES_CASE_SOURCE,
  buildNameFrom,
  examplesBuildSpec,
  readStudioState,
  studioCaseFromBuild,
  studioHref,
} from "../studio-state";
import { STUDIO_MODES, studioMode } from "../modes";
import { COMING_SOON } from "@/lib/coming-soon/registry";
import type { FactoryBuildState } from "@/features/agents/factory/types";

describe("Agent Studio state", () => {
  it("round-trips the page state through its URL (a reload resumes)", () => {
    const all = {
      mode: "improve",
      buildId: "b1",
      agentId: "a1",
      chatId: "c1",
      planId: "n1",
      planStep: "2",
      runId: "r1",
      assistantId: "s1",
    };
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

  it("an example's case: the first example that came with its input, beside that example", () => {
    const spec = examplesBuildSpec(
      [
        { output: "Dear Ms Ortiz, your roof inspection found two cracked tiles.", input: "" },
        { output: "Dear Mr Chen, the gutter on the north side is pulling away.", input: "Chen, 14 Elm St, north gutter loose" },
        { output: "   ", input: "ignored: no example" },
      ],
      "",
    );
    const cases = JSON.parse(spec.sample_inputs) as Record<string, unknown>[];
    expect(cases).toHaveLength(2);
    expect(cases.every((c) => c.source === EXAMPLES_CASE_SOURCE && typeof c.baseline_output === "string")).toBe(true);
    expect(cases[0]).not.toHaveProperty("user_input");
    expect(spec.purpose).toContain("north gutter loose");
    expect(studioCaseFromBuild({ request: { spec: { sample_inputs: spec.sample_inputs } } }, EXAMPLES_CASE_SOURCE)).toEqual({
      variables: {},
      userInput: "Chen, 14 Elm St, north gutter loose",
      approved: "Dear Mr Chen, the gutter on the north side is pulling away.",
    });
    // A mode-2 build never reads an example as its approved answer, nor the reverse.
    expect(studioCaseFromBuild({ request: { spec: { sample_inputs: spec.sample_inputs } } })).toBeNull();
  });

  it("every way in on the start screen works: no Coming Soon placeholders are left", () => {
    expect(studioMode("describe")?.id).toBe("describe");
    expect(studioMode("do-with-me")?.id).toBe("do-with-me");
    expect(studioMode("improve")?.id).toBe("improve");
    expect(studioMode("from-examples")?.id).toBe("from-examples");
    expect(STUDIO_MODES.filter((m) => m.comingSoonId)).toEqual([]);
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
