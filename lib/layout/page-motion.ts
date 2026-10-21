"use client";

// lib/layout/page-motion.ts
//
// IS THE PAGE MOVING RIGHT NOW? — one answer for every floating-chrome placement pass.
//
// Floating chrome (the assists control, the admin error badge) re-checks what lies under it by hit
// testing the page (`elementsFromPoint`). On a heavy page one pass is hundreds of hit tests over
// tens of thousands of nodes: 100–500 ms. What lies under the chrome only matters where the page
// comes to REST, so no pass may run while the person is moving it — a pointer held down (a drag, a
// resize, a pan, a marquee, a text selection) or a wheel / scroll in the last `MOTION_QUIET_MS`.
// The Board scale bench (scripts/board-scale-bench.mjs, 2026-10-21) measured the error badge's
// pass at ~2 s of main thread inside a 2 s tile drag: the 1 s backstop and every scroll fired it
// mid-gesture, and each long pass delayed the next frame by up to 500 ms.
//
// A pass that finds the page moving reschedules itself (`MOTION_QUIET_MS` later) and reads nothing.
// Guard: lib/layout/__tests__/page-motion.test.ts and features/admin/error-inspector/__tests__/.

/** Quiet time after the last wheel / scroll before the page counts as at rest. */
export const MOTION_QUIET_MS = 150;

let installed = false;
let pressed = false;
let lastMotion = Number.NEGATIVE_INFINITY;

function install(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const opts = { capture: true, passive: true } as const;
  const moved = () => {
    lastMotion = performance.now();
  };
  const release = () => {
    if (pressed) moved();
    pressed = false;
  };
  window.addEventListener("pointerdown", () => {
    pressed = true;
  }, opts);
  window.addEventListener("pointerup", release, opts);
  window.addEventListener("pointercancel", release, opts);
  window.addEventListener("blur", release, opts);
  window.addEventListener("wheel", moved, opts);
  window.addEventListener("scroll", moved, opts);
  document.addEventListener("visibilitychange", release, opts);
}

/** True while a pointer is held down or within `MOTION_QUIET_MS` of the last wheel, scroll or release. */
export function pageInMotion(now: number = performance.now()): boolean {
  install();
  return pressed || now - lastMotion < MOTION_QUIET_MS;
}

/** Start listening early (a module that will ask later calls this on mount). */
export function watchPageMotion(): void {
  install();
}

/** Tests only: forget every recorded motion. */
export function resetPageMotionForTests(): void {
  pressed = false;
  lastMotion = Number.NEGATIVE_INFINITY;
}
