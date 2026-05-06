// features/idle-mischief/acts/Act08Avalanche.ts
//
// Gravity takes over. Every small visible icon (sidebar nav buttons,
// header buttons, toolbar icons) detaches, falls to the bottom of the
// viewport, scatters horizontally, and piles up with a tilt.
//
// Clone-based: real elements are only `visibility: hidden`-ed; the
// falling shapes are clones.

import { animate } from "motion";
import { findIconLikeElements } from "../utils/targets";
import { cloneAndHide } from "../utils/cloning";

/** Cubic-bezier that approximates gravity (slow start, fast end). */
const GRAVITY_EASE: [number, number, number, number] = [0.4, 0.0, 0.7, 1.0];

export function playAvalanche(): () => void {
  if (typeof document === "undefined") return () => {};

  const targets = findIconLikeElements(40);
  if (targets.length === 0) return () => {};

  const W = window.innerWidth || 800;
  const H = window.innerHeight || 600;

  const clones: HTMLElement[] = [];
  for (const original of targets) {
    const clone = cloneAndHide(original);
    // Avalanche-specific shadow so falling icons look detached.
    clone.style.boxShadow = "0 4px 14px rgba(0,0,0,.35)";
    clone.style.borderRadius = clone.style.borderRadius || "6px";
    clones.push(clone);
  }

  if (clones.length === 0) return () => {};

  const pileBaseY = H - 40;
  const handles: ReturnType<typeof animate>[] = [];
  const settleTimers: number[] = [];

  clones.forEach((clone) => {
    const r = clone.getBoundingClientRect();
    const spreadCenter = r.left + r.width / 2;
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

    // Tiny settle wobble after landing
    const settleAt = (fallDelay + fallDur) * 1000;
    const tid = window.setTimeout(() => {
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
    }, settleAt);
    settleTimers.push(tid);
  });

  return () => {
    for (const t of settleTimers) clearTimeout(t);
    for (const h of handles) {
      try {
        h.stop();
      } catch {}
    }
  };
}
