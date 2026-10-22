/**
 * A kept agent's build record and first-runs status show in the Studio (live 2026-10-21: agent
 * 48df3009 had both in `agent.definition.metadata`, and only the admin build page showed them).
 * The metadata below is the live row's shape.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildRecordOf } from "@/features/agents/factory/build-record";

const LIVE = {
  agent_factory_build: { outcome: "saved_unproven", door: "studio", run_id: "665d38ad-1b25-431b-90b5-d986b79c1217" },
  agent_factory_first_runs: { status: "pending", needed: 3, build_id: "665d38ad-1b25-431b-90b5-d986b79c1217" },
};

describe("the Studio shows a kept agent's build record", () => {
  it("reads the outcome, the build id and the first-runs status", () => {
    expect(buildRecordOf(LIVE)).toEqual({
      outcome: "saved_unproven",
      outcomeTone: "warning",
      buildId: "665d38ad-1b25-431b-90b5-d986b79c1217",
      firstRuns: { text: "Waiting for 3 runs", tone: "warning" },
    });
    expect(buildRecordOf({})).toBeNull();
  });

  it("the Versions tab renders it", () => {
    const controls = readFileSync(join(__dirname, "..", "components", "StudioControls.tsx"), "utf8");
    expect(controls).toMatch(/<AgentBuildRecord agentId=\{agentId\} \/>/);
  });
});

describe("the build id opens a page the reader can read (review F-5)", () => {
  const ID = "665d38ad-1b25-431b-90b5-d986b79c1217";

  it("a member gets their own build page, only the admin section gets the admin page", async () => {
    const { buildPageHref } = await import("@/features/agents/factory/build-record");
    expect(buildPageHref(ID, false, "/administration/agents/factory")).toBe(`/agents/builds/${ID}`);
    expect(buildPageHref(ID, true, "/administration/agents/factory")).toBe(`/administration/agents/factory/${ID}`);
  });

  it("the record links through that rule, never straight to the admin path", () => {
    const record = readFileSync(join(__dirname, "..", "..", "factory", "components", "AgentBuildRecord.tsx"), "utf8");
    expect(record).toMatch(/buildPageHref\(record\.buildId, isAdmin, FACTORY_BASE_PATH\)/);
    expect(record).not.toMatch(/\$\{FACTORY_BASE_PATH\}\/\$\{record\.buildId\}/);
  });
});
