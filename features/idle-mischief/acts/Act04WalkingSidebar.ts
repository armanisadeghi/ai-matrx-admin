// features/idle-mischief/acts/Act04WalkingSidebar.ts
//
// The sidebar gets up and walks across the screen.
//
// Key change from v1: we no longer transform the REAL sidebar element. Real
// app layouts often have parent overflow:hidden which clips the moving
// sidebar so the user only sees a sliver — or just the legs. Instead we:
//
//   1. Capture a snapshot of the real sidebar.
//   2. Clone it (deep clone — innerHTML + computed visual state via CSS).
//   3. Mount the clone as `position: fixed` on document.body, escaping
//      any parent's overflow.
//   4. Hide the original by setting opacity:0 (still in layout — the page
//      doesn't reflow).
//   5. Animate the clone with little SVG legs pendulum-walking underneath.
//   6. On snap-back, unmount the clone and restoreElement(sidebar).

import { animate } from "motion";
import { findSidebar } from "../utils/targets";
import { registerPortal, snapshot } from "../utils/snapshot";

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

  snapshot(sidebar);
  const rect = sidebar.getBoundingClientRect();

  // Build the clone — deep-clone the sidebar's full DOM
  const clone = sidebar.cloneNode(true) as HTMLElement;
  // Strip any id attributes on cloned descendants to avoid duplicates
  clone.querySelectorAll<HTMLElement>("[id]").forEach((n) => n.removeAttribute("id"));
  if (clone.id) clone.removeAttribute("id");
  // Copy a few key computed styles so the clone looks identical
  const cs = window.getComputedStyle(sidebar);
  const bg = cs.background || cs.backgroundColor;
  clone.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    margin: 0;
    z-index: 2147483640;
    pointer-events: none;
    will-change: transform, left, top;
    background: ${bg};
    box-shadow: 0 24px 60px rgba(0,0,0,.4), 0 6px 20px rgba(0,0,0,.25);
    border-radius: 12px;
    overflow: visible;`;
  document.body.appendChild(clone);
  registerPortal(clone);

  // Hide the original — it stays in layout, just invisible
  sidebar.style.opacity = "0";
  sidebar.style.pointerEvents = "none";

  // Mount legs as a child of the clone so they translate together. Position
  // them at the bottom-center of the clone, half outside the bottom edge.
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

  // Walk path — across to the right then back. Stay within the viewport
  // with a bit of margin on the right.
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

  // Pendulum legs. Different phase per leg.
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

  // Subtle "look around" tilt on the body
  const tilt = animate(
    clone,
    { skewY: [0, -1.5, 1, -0.8, 0] },
    { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  );

  return () => {
    try {
      walk.stop();
      leg1Anim?.stop();
      leg2Anim?.stop();
      tilt.stop();
    } catch {}
    // Portal + snapshot restore handle the rest.
  };
}
