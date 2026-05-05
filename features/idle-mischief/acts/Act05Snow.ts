// features/idle-mischief/acts/Act05Snow.ts
//
// 90 snowflakes fall through the viewport in a sine-wave pattern.

import { animate } from "motion";
import { registerPortal } from "../utils/snapshot";

const FLAKE_COUNT = 90;

export function playSnow(): () => void {
  if (typeof document === "undefined") return () => {};

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position:fixed;
    inset:0;
    z-index:2147483640;
    pointer-events:none;
    overflow:hidden;`;
  document.body.appendChild(wrapper);
  registerPortal(wrapper);

  const W = window.innerWidth || 800;
  const H = window.innerHeight || 600;
  const handles: ReturnType<typeof animate>[] = [];

  for (let i = 0; i < FLAKE_COUNT; i++) {
    const size = 3 + Math.random() * 7;
    const startX = Math.random() * W;
    const drift = -40 + Math.random() * 80;
    const duration = 5 + Math.random() * 5;
    const delay = -Math.random() * duration;
    const opacity = 0.4 + Math.random() * 0.5;

    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute;
      left:${startX}px;
      top:-12px;
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:white;
      opacity:${opacity};
      box-shadow:0 0 8px rgba(255,255,255,.65);
      will-change:transform;`;
    wrapper.appendChild(el);

    handles.push(
      animate(
        el,
        {
          y: [0, H + 30],
          x: [0, drift, -drift / 2, drift, 0],
          rotate: [0, 360],
        },
        {
          duration,
          delay,
          repeat: Infinity,
          ease: "linear",
        },
      ),
    );
  }

  return () => {
    for (const h of handles) {
      try {
        h.stop();
      } catch {}
    }
  };
}
