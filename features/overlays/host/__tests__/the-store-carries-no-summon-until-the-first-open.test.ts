/**
 * Owner bar (2026-10-17): summon costs a route next to nothing until something opens. The app store
 * carries no summon slice or middleware at boot; the first open queues, loads the core once, and
 * opens. Red on the old store (summonReducers mounted eagerly: `overlays` existed at boot).
 */
import { closeOverlay, ensureSummonRuntime, isSummonInstalled, openOverlay, selectIsOverlayOpen } from "@ai-matrx/summon/open";
import { makeStore } from "@/lib/redux/store";

it("boots with no summon state, queues the first open, and opens once the core loads", async () => {
  expect(isSummonInstalled()).toBe(false);
  const store = makeStore();
  const state = () => store.getState() as Record<string, unknown>;
  expect(state().overlays).toBeUndefined();
  expect(state().windowManager).toBeUndefined();

  store.dispatch(openOverlay({ overlayId: "notesWindow" }));
  store.dispatch(openOverlay({ overlayId: "quickTasksWindow" }));
  store.dispatch(closeOverlay({ overlayId: "quickTasksWindow" }));
  expect(selectIsOverlayOpen(store.getState(), "notesWindow")).toBe(false);

  await ensureSummonRuntime();
  expect(selectIsOverlayOpen(store.getState(), "notesWindow")).toBe(true);
  expect(selectIsOverlayOpen(store.getState(), "quickTasksWindow")).toBe(false);
  expect(state().windowManager).toBeDefined();
});
