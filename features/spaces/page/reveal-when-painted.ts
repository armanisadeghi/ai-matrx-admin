// features/spaces/page/reveal-when-painted.ts — when the editor built behind a Spaces page's static first
// paint may take its place (SpacePage `revealWhenPainted`, one step per animation frame).
//
// The static body (editor/static-body.tsx) is the page's first paint; the live editor is built behind it in
// `.spaces-editor-behind` (absolute, inset 0, overflow hidden, invisible) and is swapped in when it paints the
// same page. Swapping in an editor that is still painting moves everything under the reader (lane
// SPACES-SHIFT-3, 2026-10-18: a viewer at 768 px on slow 4G read CLS 0.47–0.54 every load):
//  - Heights are the two layers' OWN ProseMirror boxes. The hidden layer's scrollHeight (the old measure)
//    can never be less than the static body's box it is pinned to, so an editor painted SHORTER than the
//    static body — database blocks 6 px tall where the static body showed their tables — "matched".
//  - Still painting: a React node view not drawn yet, a loading box, a database block whose frame has not
//    landed, the room's placeholder line (the body not synced in yet).
//  - REVEAL_CAP_MS counts from the frame nothing is painting any more (an editor whose settled page really
//    differs — a live block drawing more rows than the server did — still takes its place); it used to count
//    from the editor's mount, so on a slow network the swap happened while the blocks were still loading.
//  - REVEAL_HARD_CAP_MS: a block that never finishes painting does not keep the static picture up forever.

export const REVEAL_CAP_MS = 2500;
export const REVEAL_HARD_CAP_MS = 12_000;

/** What is still painting in the editor's layer (null when nothing is). */
export const STILL_PAINTING = [
  ".react-renderer:empty",
  ".spaces-db-loading",
  ".spaces-db-host:not(:has(.spaces-db-frame))",
  '.bn-block-outer[data-id="initialBlockId"]',
].join(", ");

export interface RevealState {
  /** Consecutive frames at the static body's height with nothing painting. */
  same: number;
  /** When the editor was mounted (ms, the frame clock). */
  started: number;
  /** The first frame nothing was painting (null while something is). */
  settledAt: number | null;
}

export function firstRevealState(now: number): RevealState {
  return { same: 0, started: now, settledAt: null };
}

const heightOf = (layer: Element): number | null => {
  const body = layer.querySelector<HTMLElement>(".ProseMirror");
  return body ? body.getBoundingClientRect().height : null;
};

/** One frame's look at the stack: swap the editor in now, or look again next frame. */
export function revealStep(stack: HTMLElement | null, state: RevealState, now: number): { reveal: boolean; state: RevealState } {
  const shown = stack?.querySelector<HTMLElement>(":scope > .spaces-static-body");
  const behind = stack?.querySelector<HTMLElement>(":scope > .spaces-editor-behind");
  if (!stack || !shown || !behind) return { reveal: true, state };
  if (now - state.started > REVEAL_HARD_CAP_MS) return { reveal: true, state };
  if (behind.querySelector(STILL_PAINTING)) return { reveal: false, state: { ...state, same: 0, settledAt: null } };
  const settledAt = state.settledAt ?? now;
  const staticPx = heightOf(shown);
  const editorPx = heightOf(behind);
  const same = staticPx !== null && editorPx !== null && Math.abs(editorPx - staticPx) <= 1 ? state.same + 1 : 0;
  return { reveal: same >= 2 || now - settledAt > REVEAL_CAP_MS, state: { ...state, same, settledAt } };
}
