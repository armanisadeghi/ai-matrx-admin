/**
 * Lane 3A-k: the Studio switch `agent_factory.studio_build_engine` is retired. Before, a Studio door read it and
 * (at its registered value `pipeline`) posted to the server route; now every Studio door builds on the workflow
 * without reading a knob, and only a door whose own knob says `legacy` stays off it.
 */
const doorValue = jest.fn(async (_door: string) => "legacy");
jest.mock("../door", () => ({ resolveFactoryDoor: (door: string) => doorValue(door) }));
jest.mock("@/lib/scoped-config/sessionKnob", () => ({
  resolveSessionKnob: async () => {
    throw new Error("a Studio build must not read a knob");
  },
  useSessionKnob: () => {
    throw new Error("a Studio build must not read a knob");
  },
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveBuildEngine } from "../build-engine";

describe("studio builds run on the agent_build workflow", () => {
  it("a Studio door is the workflow and reads no knob", async () => {
    await expect(resolveBuildEngine("studio")).resolves.toBe("workflow");
    await expect(resolveBuildEngine(null)).resolves.toBe("workflow");
  });

  it("a door with its own knob follows it", async () => {
    await expect(resolveBuildEngine("from_chat")).resolves.toBe("pipeline");
    doorValue.mockResolvedValueOnce("pipeline");
    await expect(resolveBuildEngine("from_chat")).resolves.toBe("workflow");
  });

  it("the retired switch is named nowhere in the build-engine module", () => {
    const src = readFileSync(join(__dirname, "..", "build-engine.ts"), "utf8");
    expect(src).not.toMatch(/key: "studio_build_engine"|STUDIO_ENGINE_KNOB/);
  });

  it("an admin's builtin build keeps the server route", () => {
    const src = readFileSync(join(__dirname, "..", "service.ts"), "utf8");
    expect(src).toContain("if (!input.builtin && dispatch && input.organizationId");
  });
});
