// features/spaces/page/reveal-when-painted.ts — when the editor built behind a Spaces page's static first
// paint may take its place (SpacePage `revealWhenPainted`).

export const REVEAL_CAP_MS = 2500;

export interface RevealState {
  same: number;
  started: number;
}

/** One frame's look at the stack: reveal now, or look again next frame. */
export function revealStep(stack: HTMLElement | null, state: RevealState, now: number): { reveal: boolean; state: RevealState } {
  const shown = stack?.querySelector<HTMLElement>(":scope > .spaces-static-body");
  const behind = stack?.querySelector<HTMLElement>(":scope > .spaces-editor-behind");
  if (!stack || !shown || !behind) return { reveal: true, state };
  const pending = behind.querySelector(".react-renderer:empty, .spaces-db-loading");
  const same = !pending && Math.abs(behind.scrollHeight - shown.getBoundingClientRect().height) <= 1 ? state.same + 1 : 0;
  return { reveal: same >= 2 || now - state.started > REVEAL_CAP_MS, state: { ...state, same } };
}
export const REVEAL_HARD_CAP_MS = 12000;
