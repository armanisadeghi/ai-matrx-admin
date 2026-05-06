// features/idle-mischief/acts/Act10Liquify.ts
//
// Buttons turn to jelly. A fluid skew + scale wobble that ripples across a
// dozen visible elements. Clone-based.

import { animate } from "motion";
import { findButtons } from "../utils/targets";
import { cloneAndHide } from "../utils/cloning";

export function playLiquify(): () => void {
  const targets = findButtons(12);
  if (targets.length === 0) return () => {};

  const handles = targets.map((original) => {
    const clone = cloneAndHide(original);
    const phaseDelay = Math.random() * 0.6;
    const sxAmp = 4 + Math.random() * 4;
    const syAmp = 3 + Math.random() * 3;
    return animate(
      clone,
      {
        skewX: [0, sxAmp, -sxAmp, sxAmp / 2, 0],
        skewY: [0, -syAmp, syAmp, -syAmp / 2, 0],
        scaleX: [1, 1.08, 0.92, 1.04, 1],
        scaleY: [1, 0.92, 1.08, 0.96, 1],
      },
      {
        duration: 1.6 + Math.random() * 0.5,
        repeat: Infinity,
        delay: phaseDelay,
        ease: "easeInOut",
      },
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
