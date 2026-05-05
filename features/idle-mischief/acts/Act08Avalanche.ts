// features/idle-mischief/acts/Act08Avalanche.ts
//
// Gravity takes over. Every small visible icon (sidebar nav buttons,
// header buttons, toolbar icons) detaches, falls to the bottom of the
// viewport, scatters horizontally, and piles up with a tilt.
//
// Implementation pattern: clone each icon as `position: fixed` over its
// original rect, hide the original via opacity:0, then animate the clones
// downward with gravity easing. On snap-back, every clone unmounts and
// every original is restored to its snapshot.

import { animate } from "motion";
import { findIconLikeElements } from "../utils/targets";
import { registerPortal, snapshot } from "../utils/snapshot";

/** Cubic-bezier that approximates gravity (slow start, fast end). */
const GRAVITY_EASE: [number, number, number, number] = [0.4, 0.0, 0.7, 1.0];

export function playAvalanche(): () => void {
  if (typeof document === "undefined") return () => {};

  const targets = findIconLikeElements(40);
  if (targets.length === 0) return () => {};

  const W = window.innerWidth || 800;
  const H = window.innerHeight || 600;

  // Build a clone per target. Hide original.
  const clones: HTMLElement[] = [];
  for (const el of targets) {
    snapshot(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    const clone = el.cloneNode(true) as HTMLElement;
    // Strip ids to avoid duplicates
    if (clone.id) clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((n) => (n as HTMLElement).removeAttribute("id"));
    clone.style.cssText = `
      position: fixed;
      left: ${r.left}px;
      top: ${r.top}px;
      width: ${r.width}px;
      height: ${r.height}px;
      margin: 0;
      z-index: 2147483640;
      pointer-events: none;
      will-change: transform;
      box-shadow: 0 4px 14px rgba(0,0,0,.35);
      border-radius: 6px;`;
    document.body.appendChild(clone);
    registerPortal(clone);

    el.style.opacity = "0";
    clones.push(clone);
  }

  if (clones.length === 0) return () => {};

  // Animate each clone into a pile spread along the bottom.
  const pileBaseY = H - 40;
  const handles: ReturnType<typeof animate>[] = [];

  clones.forEach((clone, i) => {
    const r = clone.getBoundingClientRect();
    // Spread targets across most of the viewport width
    const spreadCenter = r.left + r.width / 2;
    // Bias: items already to the left land more to the left, but with
    // a healthy random nudge.
    const targetX =
      Math.max(20, Math.min(W - 60, spreadCenter)) +
      (Math.random() - 0.5) * 240;
    const targetY = pileBaseY - Math.random() * 60;
    const dx = targetX - (r.left + r.width / 2);
    const dy = targetY - (r.top + r.height / 2);
    const finalRot = (Math.random() - 0.5) * 80;

    const fallDur = 1.3 + Math.random() * 0.8;
    const fallDelay = Math.random() * 0.45;

    handles.push(
      animate(
        clone,
        {
          // Phase 1: hover briefly. Phase 2: gravity to the floor with a
          // tiny bounce.
          x: [0, dx * 0.05, dx, dx],
          y: [0, -8, dy + 16, dy],
          rotate: [0, (Math.random() - 0.5) * 12, finalRot, finalRot * 0.92],
        },
        {
          duration: fallDur,
          delay: fallDelay,
          ease: ["easeOut", GRAVITY_EASE, "easeOut"],
        },
      ),
    );

    // Tiny jitter once landed
    const settleDelay = fallDelay + fallDur;
    const settleHandle = window.setTimeout(() => {
      handles.push(
        animate(
          clone,
          {
            x: [dx, dx + (Math.random() - 0.5) * 4, dx],
            rotate: [
              finalRot * 0.92,
              finalRot * 0.92 + (Math.random() - 0.5) * 3,
              finalRot * 0.9,
            ],
          },
          { duration: 0.4, ease: "easeOut" },
        ),
      );
    }, settleDelay * 1000);
    // Track timer indirectly — if snap-back happens before it fires,
    // the cleanup below clears it.
    handles.push({
      stop: () => clearTimeout(settleHandle),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  return () => {
    for (const h of handles) {
      try {
        h.stop();
      } catch {}
    }
  };
}
