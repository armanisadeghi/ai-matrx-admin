// features/idle-mischief/acts/Act06TowerCollapse.ts
//
// All open WindowPanels topple over like a stack of blocks, then bounce back.
// Caps at MAX_TOWER_WINDOWS so a heavy session doesn't lag.

import { animate } from "motion";
import { findWindowEls } from "../utils/targets";
import { MAX_TOWER_WINDOWS } from "../constants";
import { rememberTransform, restoreTransform } from "../utils/snapBack";

export function playTowerCollapse(): () => void {
  const allWindows = findWindowEls();
  if (allWindows.length === 0) return () => {};

  const windows = allWindows.slice(0, MAX_TOWER_WINDOWS);
  const handles: ReturnType<typeof animate>[] = [];

  windows.forEach((el, i) => {
    rememberTransform(el);
    const tilt = (i % 2 === 0 ? 1 : -1) * (8 + Math.random() * 6);
    const fall = 50 + Math.random() * 60;
    const delay = i * 0.08;
    const ctl = animate(
      el,
      {
        rotate: [0, tilt, -tilt * 0.6, tilt * 0.3, 0],
        y: [0, fall, fall * 0.4, fall * 0.6, 0],
        x: [0, tilt * 4, -tilt * 2, tilt * 3, 0],
      },
      {
        duration: 3.2,
        delay,
        ease: ["easeOut", "easeIn", "easeOut", "easeOut"],
      },
    );
    handles.push(ctl);
  });

  return () => {
    for (const h of handles) {
      try {
        h.stop();
      } catch {}
    }
    for (const el of windows) restoreTransform(el);
  };
}
