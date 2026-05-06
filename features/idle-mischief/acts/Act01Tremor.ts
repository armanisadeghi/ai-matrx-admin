// features/idle-mischief/acts/Act01Tremor.ts
//
// One random visible button gets a tiny ~1px jitter for ~1.4s. So small
// you'd swear you imagined it. The first taste of mischief.
//
// Implementation: clone the button, animate the clone, hide the original.
// Real DOM never gets a transform applied — snap-back is unmounting the
// clone.

import { animate } from "motion";
import { findButtons } from "../utils/targets";
import { cloneAndHide } from "../utils/cloning";

export function playTremor(): () => void {
  const candidates = findButtons(15);
  if (candidates.length === 0) return () => {};
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  const clone = cloneAndHide(target);

  const controls = animate(
    clone,
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
  };
}
