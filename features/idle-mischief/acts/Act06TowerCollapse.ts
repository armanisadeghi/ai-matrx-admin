// features/idle-mischief/acts/Act06TowerCollapse.ts
//
// All open WindowPanels topple over like a tower of blocks, then bounce
// back. Caps at MAX_TOWER_WINDOWS so a packed session doesn't lag.
//
// Clone-based: each window gets cloned + hidden so the real WindowPanel
// (with all its Redux-driven inline positioning) is never touched.

import { animate } from "motion";
import { findWindowEls } from "../utils/targets";
import { MAX_TOWER_WINDOWS } from "../constants";
import { cloneAndHide } from "../utils/cloning";

export function playTowerCollapse(): () => void {
  const allWindows = findWindowEls();
  if (allWindows.length === 0) return () => {};

  const windows = allWindows.slice(0, MAX_TOWER_WINDOWS);
  const handles: ReturnType<typeof animate>[] = [];

  windows.forEach((original, i) => {
    const clone = cloneAndHide(original);
    const tilt = (i % 2 === 0 ? 1 : -1) * (10 + Math.random() * 8);
    const fall = 60 + Math.random() * 70;
    const delay = i * 0.08;
    handles.push(
      animate(
        clone,
        {
          rotate: [0, tilt, -tilt * 0.6, tilt * 0.3, 0],
          y: [0, fall, fall * 0.4, fall * 0.6, 0],
          x: [0, tilt * 5, -tilt * 2, tilt * 3, 0],
        },
        {
          duration: 3.4,
          delay,
          ease: "easeInOut",
        },
      ),
    );
  });

  return () => {
    for (const h of handles) {
      try {
        h.stop();
      } catch {}
    }
  };
}
