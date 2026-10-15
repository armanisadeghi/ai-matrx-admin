/**
 * MKT-112: the canvas saved open with only live views (restore: false) must not come back as an open,
 * empty column. The persisted snapshot drops those tabs but keeps `isOpen`.
 */
import { canvasActions, createCanvasStore, createInitialCanvasState, toPersistableSnapshot } from "@ai-matrx/canvas";
import { canvasIsEmptyOpen } from "../host/CanvasHostProvider";

describe("a restored canvas with nothing to show", () => {
  it("is detected as empty-open, and a canvas with a tab is not", () => {
    const store = createCanvasStore();
    store.dispatch(canvasActions.hydrate(null));
    expect(canvasIsEmptyOpen(store.getState())).toBe(false);
    store.dispatch(canvasActions.setOpen(true));
    expect(canvasIsEmptyOpen(store.getState())).toBe(true);
  });

  it("the saved snapshot of an open canvas holding only unrestorable tabs reads as empty-open", () => {
    const state = { ...createInitialCanvasState(), isOpen: true };
    expect(canvasIsEmptyOpen(toPersistableSnapshot(state, () => false))).toBe(true);
  });
});
