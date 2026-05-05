// features/idle-mischief/acts/Act01Tremor.ts
//
// One random visible button gets a tiny ~1px jitter for ~1.4s. So small
// you'd swear you imagined it. The first taste of mischief.

import { animate } from "motion";
import { findButtons } from "../utils/targets";
import { snapshot } from "../utils/snapshot";

export function playTremor(): () => void {
  const candidates = findButtons(15);
  if (candidates.length === 0) return () => {};
  const target = candidates[Math.floor(Math.random() * candidates.length)];

  snapshot(target);

  const controls = animate(
    target,
    {
      x: [0, 1, -1, 1, -1, 0.5, -0.5, 0],
      y: [0, -1, 1, -0.5, 0.5, 0, -1, 0],
    },
    { duration: 1.4, repeat: 0, ease: "linear" },
  );

  return () => {
    try {
      controls.stop();
    } catch {}
    // Snap-back path will call restoreElement via restoreAll(); no manual
    // transform reset needed.
  };
}
