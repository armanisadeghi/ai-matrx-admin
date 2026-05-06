// features/idle-mischief/acts/Act04WalkingSidebar.ts
//
// The sidebar gets up and walks across the screen.
//
// Uses cloneAndHide() — the real sidebar is only hidden via
// `visibility: hidden`, never animated. The clone (positioned fixed, on
// document.body, escaping every parent's overflow) does the walking.

import { animate } from "motion";
import { findSidebar } from "../utils/targets";
import { cloneAndHide } from "../utils/cloning";

const LEGS_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 70" width="80" height="70" style="overflow:visible">
  <g id="leg1" transform="translate(28 0)">
    <line x1="0" y1="0" x2="0" y2="42" stroke="#1f1e1c" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="0" cy="50" rx="14" ry="6" fill="#0c0b0a" stroke="#1f1e1c" stroke-width="1.5"/>
  </g>
  <g id="leg2" transform="translate(56 0)">
    <line x1="0" y1="0" x2="0" y2="42" stroke="#1f1e1c" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="0" cy="50" rx="14" ry="6" fill="#0c0b0a" stroke="#1f1e1c" stroke-width="1.5"/>
  </g>
</svg>`.trim();

export function playWalkingSidebar(): () => void {
  const sidebar = findSidebar();
  if (!sidebar) return () => {};

  const clone = cloneAndHide(sidebar);
  // Add a drop shadow + rounded corners so the walking sidebar looks like
  // it lifted off the page.
  clone.style.boxShadow =
    "0 24px 60px rgba(0,0,0,.4), 0 6px 20px rgba(0,0,0,.25)";
  clone.style.borderRadius = "12px";

  // Mount legs as a child of the clone so they translate together.
  const legsHost = document.createElement("div");
  legsHost.style.cssText = `
    position: absolute;
    left: 50%;
    bottom: -40px;
    width: 80px;
    height: 70px;
    margin-left: -40px;
    pointer-events: none;
    will-change: transform;`;
  legsHost.innerHTML = LEGS_SVG;
  clone.appendChild(legsHost);
  const leg1 = legsHost.querySelector<SVGGElement>("#leg1");
  const leg2 = legsHost.querySelector<SVGGElement>("#leg2");

  const rect = clone.getBoundingClientRect();
  const margin = 20;
  const maxX = Math.max(
    160,
    window.innerWidth - rect.left - rect.width - margin,
  );

  const walk = animate(
    clone,
    {
      x: [0, maxX * 0.4, maxX, maxX * 0.6, 0],
      y: [0, -10, -2, -8, 0],
      rotate: [0, -2.5, 1.5, -1.5, 0],
    },
    { duration: 5.4, ease: "easeInOut" },
  );

  const leg1Anim =
    leg1 &&
    animate(
      leg1,
      { rotate: [-26, 26, -26], y: [0, -4, 0] },
      { duration: 0.45, repeat: Infinity, ease: "easeInOut" },
    );
  const leg2Anim =
    leg2 &&
    animate(
      leg2,
      { rotate: [26, -26, 26], y: [0, -4, 0] },
      { duration: 0.45, repeat: Infinity, ease: "easeInOut" },
    );

  return () => {
    try {
      walk.stop();
      leg1Anim?.stop();
      leg2Anim?.stop();
    } catch {}
  };
}
