import { claudeCodePrompt } from "../claude-code-prompt";
import { STUDIO_MODES } from "../../modes";

describe("the Claude Code prompt", () => {
  it("connects the plugin, runs the export skill, and forbids Claude writing the agent", () => {
    const p = claudeCodePrompt("");
    expect(p).toContain("/plugin marketplace add AI-Matrix-Engine/matrx-claude-plugin");
    expect(p).toContain("/plugin install matrx@matrx");
    expect(p).toContain("export-agent-to-ai-matrx");
    expect(p).toContain("Do not write or build the agent yourself");
    expect(p).not.toContain("What the agent should do");
  });

  it("carries the person's own words when given", () => {
    expect(claudeCodePrompt("  Write the weekly status update ")).toMatch(/What the agent should do: Write the weekly status update$/);
  });
});

describe("the two bring-over modes", () => {
  it("are live doors with their own page, not coming-soon cards", () => {
    for (const id of ["from-claude-account", "with-claude-code"]) {
      const mode = STUDIO_MODES.find((m) => m.id === id);
      expect(mode?.href).toMatch(/^\/agents\/new\/studio\//);
      expect(mode?.comingSoonId).toBeUndefined();
    }
  });
});
