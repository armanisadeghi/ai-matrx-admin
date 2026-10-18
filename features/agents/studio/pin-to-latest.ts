/**
 * Holds a reopened transcript at its bottom while its history renders (messages mount and settle for a
 * while after the load: markdown, tool rows, a cold compile), then lets go once the content has been still
 * for `quietMs` (or after `maxMs`); the person scrolling, tapping or typing first ends it at once.
 * Returns the cleanup.
 */
export function pinToLatest(root: HTMLElement | null, quietMs = 1500, maxMs = 15000): () => void {
  const scroller = root?.querySelector<HTMLElement>(".overflow-y-auto") ?? null;
  if (!scroller) return () => {};
  const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  let quiet = 0;
  const stop = () => {
    observer?.disconnect();
    window.clearTimeout(quiet);
    window.clearTimeout(cap);
    for (const e of events) scroller.removeEventListener(e, stop);
  };
  const pin = () => {
    scroller.scrollTop = scroller.scrollHeight;
    window.clearTimeout(quiet);
    quiet = window.setTimeout(stop, quietMs);
  };
  const content = scroller.firstElementChild ?? scroller;
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(pin);
  observer?.observe(content);
  const cap = window.setTimeout(stop, maxMs);
  for (const e of events) scroller.addEventListener(e, stop, { passive: true });
  pin();
  return stop;
}
