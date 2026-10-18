/**
 * Holds a reopened transcript at its bottom while its history renders (messages mount and settle for a
 * moment after the load), then lets go; the person scrolling first ends it at once. Returns the cleanup.
 */
export function pinToLatest(root: HTMLElement | null, settleMs = 2500): () => void {
  const scroller = root?.querySelector<HTMLElement>(".overflow-y-auto") ?? null;
  if (!scroller) return () => {};
  const pin = () => {
    scroller.scrollTop = scroller.scrollHeight;
  };
  pin();
  const content = scroller.firstElementChild ?? scroller;
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(pin);
  observer?.observe(content);
  const stop = () => {
    observer?.disconnect();
    window.clearTimeout(timer);
    for (const e of ["wheel", "touchstart", "keydown", "pointerdown"]) scroller.removeEventListener(e, stop);
  };
  const timer = window.setTimeout(stop, settleMs);
  for (const e of ["wheel", "touchstart", "keydown", "pointerdown"]) scroller.addEventListener(e, stop, { passive: true });
  return stop;
}
