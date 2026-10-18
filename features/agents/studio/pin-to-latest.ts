/**
 * Holds a reopened transcript at its bottom while its history renders (older turns mount above the latest
 * ones and settle for a while after the load), then lets go once its height has been still for `quietMs`
 * (or after `maxMs`); the person scrolling, tapping or typing first ends it at once. Returns the cleanup.
 *
 * Height is polled, not observed: the transcript's inner nodes are replaced while it hydrates, so an observer
 * on the first child went deaf (live 2026-10-18: the view stayed at 464 of 4540 after the history mounted).
 */
export function pinToLatest(root: HTMLElement | null, quietMs = 1500, maxMs = 15000, everyMs = 100): () => void {
  const scroller = root?.querySelector<HTMLElement>(".overflow-y-auto") ?? null;
  if (!scroller) return () => {};
  const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  const started = Date.now();
  let height = -1;
  let stillSince = Date.now();
  const tick = () => {
    if (scroller.scrollHeight !== height) {
      height = scroller.scrollHeight;
      stillSince = Date.now();
    }
    scroller.scrollTop = scroller.scrollHeight;
    if (Date.now() - stillSince >= quietMs || Date.now() - started >= maxMs) stop();
  };
  const timer = window.setInterval(tick, everyMs);
  const stop = () => {
    window.clearInterval(timer);
    for (const e of events) scroller.removeEventListener(e, stop);
  };
  for (const e of events) scroller.addEventListener(e, stop, { passive: true });
  tick();
  return stop;
}
