/**
 * EVERY BINDING EDITOR OPENS A BINDING ON ITS OWN TIER (L6c, 2026-10-18).
 *
 * D1: an ORGANIZATION-tier binding opened as Scope "User", and Save created a
 * second, user-tier binding beside it. The tier of a stored binding is the
 * identity of its row (`binding:o:<org>` role), so an editor must (a) open on
 * that tier and (b) save with the same tier fields, which upserts that row.
 * D3: a removed binding stayed in the mounted "Agents for this page" list.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { AGENT_SCOPES } from "@/features/agent-shortcuts/constants";
import { bindingTier } from "../utils/binding-tier";

const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const none = { userId: null, organizationId: null, projectId: null, taskId: null };

describe("bindingTier", () => {
  it("opens an org binding on the Organization tier with the org id", () => {
    expect(bindingTier({ ...none, organizationId: "org-1" })).toEqual({
      scope: AGENT_SCOPES.ORGANIZATION,
      scopeId: "org-1",
    });
  });
  it("opens user / project / task / global on their own tier", () => {
    expect(bindingTier({ ...none, userId: "u" }).scope).toBe(AGENT_SCOPES.USER);
    expect(bindingTier({ ...none, projectId: "p" }).scope).toBe(AGENT_SCOPES.PROJECT);
    expect(bindingTier({ ...none, taskId: "t" }).scope).toBe(AGENT_SCOPES.TASK);
    expect(bindingTier(none)).toEqual({ scope: AGENT_SCOPES.GLOBAL, scopeId: undefined });
  });
  it("round-trips: the save scope built from the tier is the binding's own row", () => {
    const b = { ...none, organizationId: "org-1" };
    const { scope, scopeId } = bindingTier(b);
    const saved = {
      userId: scope === AGENT_SCOPES.USER ? scopeId : null,
      organizationId: scope === AGENT_SCOPES.ORGANIZATION ? scopeId : null,
      projectId: scope === AGENT_SCOPES.PROJECT ? scopeId : null,
      taskId: scope === AGENT_SCOPES.TASK ? scopeId : null,
    };
    expect(saved).toEqual(b);
  });
});

describe("editors that take an existing binding", () => {
  it("BindingColumn opens on the binding's tier and remounts when it loads", () => {
    const src = read("features/surfaces/admin/columns/BindingColumn.tsx");
    expect(src).toContain("bindingTier(existing)");
    expect(src).toMatch(/key=\{`[^`]*existing\?\.id/);
  });
  it("SurfaceAgentBindPanel opens an existing binding on its tier", () => {
    const src = read("features/surfaces/components/bind/SurfaceAgentBindPanel.tsx");
    expect(src).toContain("bindingTier(existing)");
  });
  it("AgentAccessColumn and AgentSurfacesPanel save with the stored tier", () => {
    const access = read("features/surfaces/admin/columns/AgentAccessColumn.tsx");
    expect(access).toMatch(/userId: existing\.userId/);
    const panel = read("features/surfaces/components/AgentSurfacesPanel.tsx");
    expect(panel).toContain("scopeFromBinding(existing)");
  });
});

describe("every binding writer tells mounted lists", () => {
  const writers = execSync(
    `git grep -l -e "upsertAgentSurfaceBindingThunk(" -e "upsertAgentSurfaceBinding(" -e "bindAgentToSurface(" -e "bulkUpsertAgentSurfaceBindingsThunk(" -e "deleteAgentSurfaceBindingThunk(" -e "deleteAgentSurfaceBinding(" -- 'features/**/*.ts' 'features/**/*.tsx' ':!**/__tests__/**'`,
    { cwd: ROOT, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
  it("finds the writers", () => {
    expect(writers.length).toBeGreaterThanOrEqual(7);
  });
  it.each(writers)("%s announces a change", (file) => {
    expect(read(file)).toContain("announceBindingsChanged(");
  });
  it("the popover list refreshes on the announcement", () => {
    expect(read("features/surfaces/components/bind/SurfaceBoundAgentsList.tsx")).toContain(
      "useOnBindingsChanged(",
    );
  });
});
