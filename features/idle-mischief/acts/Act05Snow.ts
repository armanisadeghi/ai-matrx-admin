// features/idle-mischief/acts/Act05Snow.ts
//
// Simple, dependency-free snow: 70 absolutely-positioned dots, each falling
// in a sine-wave with a randomized speed and drift. Avoids tsparticles to
// keep the bundle slim and the snap-back instant.

import { animate } from "motion";

const FLAKE_COUNT = 70;

interface Flake {
  el: HTMLDivElement;
  control: ReturnType<typeof animate>;
}

export function playSnow(): () => void {
  if (typeof document === "undefined") return () => {};

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position:fixed;inset:0;z-index:2147483640;pointer-events:none;
    overflow:hidden;`;
  document.body.appendChild(wrapper);

  const flakes: Flake[] = [];
  const W = window.innerWidth;
  const H = window.innerHeight;

  for (let i = 0; i < FLAKE_COUNT; i++) {
    const size = 3 + Math.random() * 6;
    const startX = Math.random() * W;
    const drift = -30 + Math.random() * 60;
    const duration = 5 + Math.random() * 5;
    const delay = -Math.random() * duration;
    const opacity = 0.4 + Math.random() * 0.5;

    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute;left:${startX}px;top:-12px;
      width:${size}px;height:${size}px;border-radius:50%;
      background:white;opacity:${opacity};
      box-shadow:0 0 6px rgba(255,255,255,.6);
      will-change:transform;`;
    wrapper.appendChild(el);

    const control = animate(
      el,
      {
        y: [0, H + 20],
        x: [0, drift, -drift / 2, drift, 0],
        rotate: [0, 360],
      },
      {
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      },
    );

    flakes.push({ el, control });
  }

  return () => {
    for (const f of flakes) {
      try {
        f.control.stop();
      } catch {}
    }
    wrapper.remove();
  };
}
