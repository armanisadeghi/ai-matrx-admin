// features/idle-mischief/acts/Act04WalkingSidebar.ts
//
// The sidebar grows two little SVG legs out the bottom and walks across the
// viewport in a sine wave, then rubber-bands home. Pure transform on the real
// sidebar — snap-back resets the transform; legs are a portal child.

import { animate } from "motion";
import { findSidebar, rectOf } from "../utils/targets";
import { rememberTransform, restoreTransform } from "../utils/snapBack";

const LEGS_SVG = `
<svg width="64" height="56" viewBox="0 0 64 56" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <g id="leg1" transform="translate(20 0)">
    <line x1="0" y1="0" x2="0" y2="34" stroke="#3b3a36" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="0" cy="40" rx="11" ry="6" fill="#1f1e1c"/>
  </g>
  <g id="leg2" transform="translate(44 0)">
    <line x1="0" y1="0" x2="0" y2="34" stroke="#3b3a36" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="0" cy="40" rx="11" ry="6" fill="#1f1e1c"/>
  </g>
</svg>`.trim();

export function playWalkingSidebar(): () => void {
  const sidebar = findSidebar();
  if (!sidebar) return () => {};

  rememberTransform(sidebar);
  // Make sure transform doesn't get blocked by parent overflow
  const prevWillChange = sidebar.style.willChange;
  sidebar.style.willChange = "transform";

  const rect = rectOf(sidebar);

  // Mount legs container (fixed-positioned, follows the sidebar transform)
  const legsHost = document.createElement("div");
  legsHost.style.cssText = `
    position:fixed;left:${rect.x + rect.width / 2 - 32}px;
    top:${rect.y + rect.height - 6}px;
    width:64px;height:56px;z-index:2147483645;pointer-events:none;
    will-change:transform;`;
  legsHost.innerHTML = LEGS_SVG;
  document.body.appendChild(legsHost);

  const leg1 = legsHost.querySelector<SVGGElement>("#leg1");
  const leg2 = legsHost.querySelector<SVGGElement>("#leg2");

  // Walk path: side-to-side, mostly to the right, then back
  const maxX = Math.min(window.innerWidth - rect.x - rect.width - 24, 360);
  const sidebarWalk = animate(
    sidebar,
    {
      x: [0, maxX * 0.4, maxX, maxX * 0.6, 0],
      y: [0, -4, -1, -3, 0],
      rotate: [0, -1.5, 1, -1, 0],
    },
    { duration: 5.4, ease: "easeInOut" },
  );
  const legsWalk = animate(
    legsHost,
    {
      x: [0, maxX * 0.4, maxX, maxX * 0.6, 0],
      y: [0, -4, -1, -3, 0],
    },
    { duration: 5.4, ease: "easeInOut" },
  );

  // Pendulum legs
  const leg1Anim =
    leg1 &&
    animate(
      leg1,
      { rotate: [-22, 22, -22] },
      {
        duration: 0.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    );
  const leg2Anim =
    leg2 &&
    animate(
      leg2,
      { rotate: [22, -22, 22] },
      {
        duration: 0.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    );

  return () => {
    try {
      sidebarWalk.stop();
      legsWalk.stop();
      leg1Anim?.stop();
      leg2Anim?.stop();
    } catch {}
    legsHost.remove();
    restoreTransform(sidebar);
    sidebar.style.willChange = prevWillChange;
  };
}
