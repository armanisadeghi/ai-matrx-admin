/**
 * When the page is fitted to the editor's width. Only a phone-sized WINDOW fits the page; a desktop editor whose stage got
 * narrower because the comment rail or the outline opened beside it keeps its zoom (adv walk 2026-10-21: the page suddenly
 * rendered at 45% when the rail opened, while the zoom box read 100%). Once a fit was applied, widening the window puts the
 * page back to 100%. Anything else is the person's own zoom and is never touched.
 */
export const PHONE_WINDOW_MAX = 640;

/** The zoom to apply now, or null to leave the zoom alone. `fitted` is whether this editor applied a fit earlier. */
export function fitZoomToApply(windowWidth: number, fitted: boolean, fit: number): number | null {
  if (windowWidth > 0 && windowWidth <= PHONE_WINDOW_MAX) return fit;
  return fitted ? 1 : null;
}
