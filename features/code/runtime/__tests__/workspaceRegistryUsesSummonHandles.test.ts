/**
 * D-5 — code workspaces live in summon's one handle registry, not a second Map: a handle registered
 * here is visible to summon's handle reader, and replacing/unregistering behaves as before.
 */
import { peekHandle } from "@ai-matrx/summon/open";
import { callbackManager } from "@ai-matrx/summon/handles";
import { WORKSPACE_HANDLE_GROUP, getWorkspace, registerWorkspace, tryGetWorkspace, workspaceIdsFromHandleIds, type WorkspaceRuntimeHandle } from "../workspaceRegistry";

const fake = (id: string) => ({ id, filesystem: {}, process: {}, store: {} }) as unknown as WorkspaceRuntimeHandle;

describe("code workspace registry on summon handles", () => {
  it("registers into summon's handle slot and unregisters", () => {
    const a = fake("default");
    const off = registerWorkspace(a);
    expect(peekHandle("code-workspace:default")).toBe(a);
    expect(getWorkspace()).toBe(a);
    // the Extensions panel lists workspaces from summon's group
    expect(workspaceIdsFromHandleIds(callbackManager.groupMembers(WORKSPACE_HANDLE_GROUP))).toEqual(["default"]);
    off();
    expect(callbackManager.groupMembers(WORKSPACE_HANDLE_GROUP)).toEqual([]);
    expect(tryGetWorkspace()).toBeNull();
    expect(() => getWorkspace()).toThrow(/No workspace registered/);
  });

  it("a stale unregister never removes the newer mount", () => {
    const a = fake("w1");
    const b = fake("w1");
    const offA = registerWorkspace(a);
    const offB = registerWorkspace(b);
    offA();
    expect(tryGetWorkspace("w1")).toBe(b);
    offB();
    expect(tryGetWorkspace("w1")).toBeNull();
  });
});
