
import { APP_OVERLAYS } from "@/features/overlays/definitions/registry";

/** The old catalogue's shape, read from the definitions (the catalogue file is gone). */
const OVERLAYS_BY_ID: Record<string, { label: string; isWindow: boolean; instanceMode: "singleton" | "multi"; closesOnNavigation: boolean }> = Object.fromEntries(
  APP_OVERLAYS.map((d) => [d.id, { label: d.label, isWindow: !!d.window, instanceMode: d.instance === "multi" ? "multi" : "singleton", closesOnNavigation: !!d.closesOnNavigation }]),
);
const isPersistableWindow = (overlayId: string): boolean => { const w = APP_OVERLAYS.find((d) => d.id === overlayId)?.window; return !!w && w.windowId !== undefined && !w.ephemeral; };


describe("Watch AI and Workflow run are never restored on load", () => {
  it("Watch AI is not a persistable window", () => {
    expect(isPersistableWindow("aiWatchWindow")).toBe(false);
  });
  it("Workflow run is not a persistable window", () => {
    expect(isPersistableWindow("workflowRunWindow")).toBe(false);
  });
});
