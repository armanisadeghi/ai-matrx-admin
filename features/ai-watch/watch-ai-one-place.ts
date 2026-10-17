/**
 * Watch AI lives in ONE place: the floating window or the canvas column, never both (Arman,
 * 2026-10-17: on reload it opened as both). Several doors open it — the sidebar toggle, auto-watch,
 * a run's own button, the "no room" hand-off — and each can land in a different place, so the rule
 * is enforced where both can be seen (`AutoWatch`): when both exist, close the one that does not fit.
 */
export type WatchAiPlace = "window" | "canvas";

/** Which copy to close when Watch AI is open in both places; null when it is in at most one. */
export function watchAiCopyToClose(input: { windowOpen: boolean; canvasOpen: boolean; room: boolean | null }): WatchAiPlace | null {
  if (!input.windowOpen || !input.canvasOpen) return null;
  // Room beside the page: the floating window is what the person sees first. No room (or not measured
  // yet): the canvas column is the place that never covers the page.
  return input.room === true ? "canvas" : "window";
}
