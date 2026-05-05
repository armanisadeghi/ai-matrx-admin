// features/idle-mischief/acts/Act03Eyes.ts
//
// The signature moment. Two icons in the sidebar drift toward each other,
// morph into a pair of cartoon eyes that blink, glance around, track the
// cursor for a beat, then drift home.
//
// Implementation: we hide the original icons via opacity, mount an absolute
// portal container with two SVG eyes positioned over the icons' captured
// rects, animate the wrapper across to bring the eyes ~28px apart, then
// kick in pupil tracking + blinks. Snap-back unmounts the portal and
// restores opacity in one frame.

import { animate } from "motion";
import { findSidebarIcons, rectOf, type TargetRect } from "../utils/targets";
import { rememberOpacity, restoreOpacity } from "../utils/snapBack";

interface EyeOverlay {
  wrapper: HTMLDivElement;
  whiteEye1: HTMLDivElement;
  whiteEye2: HTMLDivElement;
  pupil1: HTMLDivElement;
  pupil2: HTMLDivElement;
  lid1: HTMLDivElement;
  lid2: HTMLDivElement;
}

function mountEyeOverlay(rect1: TargetRect, rect2: TargetRect): EyeOverlay {
  const size = Math.min(28, Math.max(18, Math.min(rect1.width, rect2.width) + 6));
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;inset:0;z-index:2147483646;pointer-events:none;";

  const makeEye = (cx: number, cy: number) => {
    const eye = document.createElement("div");
    eye.style.cssText = `
      position:absolute;left:${cx - size / 2}px;top:${cy - size / 2}px;
      width:${size}px;height:${size}px;border-radius:50%;
      background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,.25),
        inset 0 0 0 1px rgba(0,0,0,.15);
      overflow:hidden;will-change:transform;`;
    const pupil = document.createElement("div");
    const pSize = Math.max(6, Math.round(size * 0.4));
    pupil.style.cssText = `
      position:absolute;left:50%;top:50%;width:${pSize}px;height:${pSize}px;
      margin-left:${-pSize / 2}px;margin-top:${-pSize / 2}px;
      border-radius:50%;background:#0b0b0c;will-change:transform;`;
    const lid = document.createElement("div");
    lid.style.cssText = `
      position:absolute;left:0;right:0;top:0;height:0%;
      background:linear-gradient(180deg,#caa179,#a07a4f);
      will-change:height;`;
    eye.appendChild(pupil);
    eye.appendChild(lid);
    wrapper.appendChild(eye);
    return { eye, pupil, lid };
  };

  const cx1 = rect1.x + rect1.width / 2;
  const cy1 = rect1.y + rect1.height / 2;
  const cx2 = rect2.x + rect2.width / 2;
  const cy2 = rect2.y + rect2.height / 2;

  const e1 = makeEye(cx1, cy1);
  const e2 = makeEye(cx2, cy2);
  document.body.appendChild(wrapper);

  return {
    wrapper,
    whiteEye1: e1.eye,
    whiteEye2: e2.eye,
    pupil1: e1.pupil,
    pupil2: e2.pupil,
    lid1: e1.lid,
    lid2: e2.lid,
  };
}

export function playEyes(): () => void {
  const icons = findSidebarIcons(6);
  if (icons.length < 2) return () => {};

  const a = icons[0];
  const b = icons[1];
  const rectA = rectOf(a);
  const rectB = rectOf(b);
  const targetRectA: TargetRect = rectA;
  const targetRectB: TargetRect = rectB;

  rememberOpacity(a);
  rememberOpacity(b);
  a.style.opacity = "0";
  b.style.opacity = "0";

  const overlay = mountEyeOverlay(targetRectA, targetRectB);

  // Drift eyes slightly toward each other
  const cxA = targetRectA.x + targetRectA.width / 2;
  const cxB = targetRectB.x + targetRectB.width / 2;
  const drift = Math.max(0, (Math.abs(cxA - cxB) - 32) / 4);

  const driftA = animate(
    overlay.whiteEye1,
    { x: cxA < cxB ? drift : -drift, y: [0, -2, 0] },
    { duration: 1.6, ease: "easeOut" },
  );
  const driftB = animate(
    overlay.whiteEye2,
    { x: cxA < cxB ? -drift : drift, y: [0, -2, 0] },
    { duration: 1.6, ease: "easeOut" },
  );

  // Pupil tracking — listen for cursor; if no movement, sweep gently
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let lastMove = 0;
  const onMove = (e: MouseEvent) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    lastMove = Date.now();
  };
  window.addEventListener("mousemove", onMove, { passive: true });

  let raf = 0;
  const loop = () => {
    const stale = Date.now() - lastMove > 700;
    const t = Date.now() / 600;
    const sweepX = stale ? Math.cos(t) * 4 : 0;
    const sweepY = stale ? Math.sin(t * 1.3) * 2 : 0;
    const drag = (eye: HTMLDivElement, pupil: HTMLDivElement) => {
      const r = eye.getBoundingClientRect();
      const dx = mouseX - (r.left + r.width / 2);
      const dy = mouseY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const max = r.width * 0.18;
      const px = (dx / dist) * Math.min(dist * 0.05, max) + sweepX;
      const py = (dy / dist) * Math.min(dist * 0.05, max) + sweepY;
      pupil.style.transform = `translate(${px}px,${py}px)`;
    };
    drag(overlay.whiteEye1, overlay.pupil1);
    drag(overlay.whiteEye2, overlay.pupil2);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  // Two blinks at 1.4s and 3.2s
  const blink = (lid: HTMLDivElement) =>
    animate(
      lid,
      { height: ["0%", "100%", "0%"] },
      { duration: 0.18, ease: "easeInOut" },
    );
  const t1 = window.setTimeout(() => {
    blink(overlay.lid1);
    blink(overlay.lid2);
  }, 1400);
  const t2 = window.setTimeout(() => {
    blink(overlay.lid1);
    blink(overlay.lid2);
  }, 3200);

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(t1);
    clearTimeout(t2);
    window.removeEventListener("mousemove", onMove);
    try {
      driftA.stop();
      driftB.stop();
    } catch {}
    overlay.wrapper.remove();
    restoreOpacity(a);
    restoreOpacity(b);
  };
}
