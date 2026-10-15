/**
 * MKT-096: opening a page never pops Watch AI or Workflow run over it before a run starts.
 * Both windows are AutoWatch's to open, on the page's own live run; neither is restored on load.
 */
import { isPersistableWindow } from "@/features/window-panels/registry/windowRegistryMetadata";

describe("Watch AI and Workflow run are never restored on load", () => {
  it("Watch AI is not a persistable window", () => {
    expect(isPersistableWindow("aiWatchWindow")).toBe(false);
  });
  it("Workflow run is not a persistable window", () => {
    expect(isPersistableWindow("workflowRunWindow")).toBe(false);
  });
});
