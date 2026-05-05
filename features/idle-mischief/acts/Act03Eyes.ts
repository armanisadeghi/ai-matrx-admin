// features/idle-mischief/acts/Act03Eyes.ts
//
// A pair of cartoon eyes shows up somewhere visible — at the top-center of
// the viewport — and tracks the cursor + blinks twice + drifts. Sized so
// they're impossible to miss.
//
// We do NOT mount them inside the sidebar anymore (the sidebar is usually
// collapsed and the eyes were invisible). The viewport is the stage.

import { animate } from "motion";
import { registerPortal } from "../utils/snapshot";

interface EyeRefs {
  white: HTMLDivElement;
  pupil: HTMLDivElement;
  lid: HTMLDivElement;
}

function makeEye(cx: number, cy: number, size: number): EyeRefs {
  const eye = document.createElement("div");
  eye.style.cssText = `
    position:fixed;
    left:${cx - size / 2}px;
    top:${cy - size / 2}px;
    width:${size}px;
    height:${size}px;
    border-radius:50%;
    background:#ffffff;
    box-shadow: 0 4px 16px rgba(0,0,0,.3),
      inset 0 -2px 6px rgba(0,0,0,.08),
      inset 0 0 0 2px rgba(0,0,0,.18);
    overflow:hidden;
    will-change:transform;`;
  const pupil = document.createElement("div");
  const pSize = Math.max(10, Math.round(size * 0.42));
  pupil.style.cssText = `
    position:absolute;
    left:50%;
    top:50%;
    width:${pSize}px;
    height:${pSize}px;
    margin-left:${-pSize / 2}px;
    margin-top:${-pSize / 2}px;
    border-radius:50%;
    background:radial-gradient(circle at 30% 30%, #404044 0%, #0a0a0c 60%);
    will-change:transform;
    box-shadow: inset -2px -2px 4px rgba(255,255,255,.15);`;
  const highlight = document.createElement("div");
  highlight.style.cssText = `
    position:absolute;
    left:25%;
    top:22%;
    width:18%;
    height:18%;
    border-radius:50%;
    background:white;
    opacity:.85;
    pointer-events:none;`;
  pupil.appendChild(highlight);
  const lid = document.createElement("div");
  lid.style.cssText = `
    position:absolute;
    left:0;
    right:0;
    top:0;
    height:0%;
    background:linear-gradient(180deg,#caa179 0%,#a07a4f 100%);
    will-change:height;
    border-bottom: 2px solid rgba(0,0,0,.15);`;
  eye.appendChild(pupil);
  eye.appendChild(lid);
  return { white: eye, pupil, lid };
}

export function playEyes(): () => void {
  if (typeof document === "undefined") return () => {};

  // Put the eyes at the top-center, well below the very top so they're
  // clearly inside the page chrome.
  const eyeSize = Math.min(56, Math.max(44, window.innerWidth * 0.05));
  const gap = eyeSize * 0.55;
  const cx = window.innerWidth / 2;
  const cy = 110;

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;inset:0;z-index:2147483646;pointer-events:none;";

  const eyeL = makeEye(cx - gap - eyeSize / 2, cy, eyeSize);
  const eyeR = makeEye(cx + gap + eyeSize / 2, cy, eyeSize);
  wrapper.appendChild(eyeL.white);
  wrapper.appendChild(eyeR.white);
  document.body.appendChild(wrapper);
  registerPortal(wrapper);

  // Entrance: pop in with a little squash & stretch
  const entranceL = animate(
    eyeL.white,
    { scale: [0, 1.15, 1], y: [-20, 0, 0] },
    { duration: 0.55, ease: "easeOut" },
  );
  const entranceR = animate(
    eyeR.white,
    { scale: [0, 1.15, 1], y: [-20, 0, 0] },
    { duration: 0.55, delay: 0.08, ease: "easeOut" },
  );

  // Pupil tracking — follow cursor; if cursor hasn't moved, sweep gently
  let mouseX = window.innerWidth / 2;
  let mouseY = cy + 80;
  let lastMove = 0;
  const onMove = (e: MouseEvent) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    lastMove = Date.now();
  };
  window.addEventListener("mousemove", onMove, { passive: true });

  let raf = 0;
  const drag = (eye: HTMLDivElement, pupil: HTMLDivElement, sweepX: number, sweepY: number) => {
    const r = eye.getBoundingClientRect();
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;
    const dx = mouseX - ex;
    const dy = mouseY - ey;
    const dist = Math.hypot(dx, dy) || 1;
    const max = r.width * 0.18;
    const px = (dx / dist) * Math.min(dist * 0.06, max) + sweepX;
    const py = (dy / dist) * Math.min(dist * 0.06, max) + sweepY;
    pupil.style.transform = `translate(${px}px,${py}px)`;
  };
  const loop = () => {
    const stale = Date.now() - lastMove > 700;
    const t = Date.now() / 600;
    const sx = stale ? Math.cos(t) * 4 : 0;
    const sy = stale ? Math.sin(t * 1.3) * 2 : 0;
    drag(eyeL.white, eyeL.pupil, sx, sy);
    drag(eyeR.white, eyeR.pupil, sx, sy);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  // Blink twice
  const blink = (lid: HTMLDivElement) =>
    animate(
      lid,
      { height: ["0%", "100%", "0%"] },
      { duration: 0.22, ease: "easeInOut" },
    );
  const t1 = window.setTimeout(() => {
    blink(eyeL.lid);
    blink(eyeR.lid);
  }, 1200);
  const t2 = window.setTimeout(() => {
    blink(eyeL.lid);
    blink(eyeR.lid);
  }, 3000);

  // Subtle bob through the run
  const bobL = animate(
    eyeL.white,
    { y: [0, -3, 0, 3, 0] },
    { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 },
  );
  const bobR = animate(
    eyeR.white,
    { y: [0, 3, 0, -3, 0] },
    { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.7 },
  );

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(t1);
    clearTimeout(t2);
    window.removeEventListener("mousemove", onMove);
    try {
      entranceL.stop();
      entranceR.stop();
      bobL.stop();
      bobR.stop();
    } catch {}
    // Snap-back will unmount the wrapper portal.
  };
}
