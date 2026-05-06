// features/idle-mischief/acts/Act02Wiggle.ts
//
// 4-6 visible buttons gently bob and rock. They look fidgety, like they
// can't quite hold still. Clone-based: real elements untouched.

import { animate } from "motion";
import { findButtons } from "../utils/targets";
import { cloneAndHide } from "../utils/cloning";

export function playWiggle(): () => void {
  const targets = findButtons(6);
  if (targets.length === 0) return () => {};

  const handles = targets.map((original) => {
    const clone = cloneAndHide(original);
    const phaseDelay = Math.random() * 0.8;
    const yAmp = 2 + Math.random() * 1.5;
    return animate(
      clone,
      {
        y: [0, -yAmp, 0, yAmp, 0],
        rotate: [0, -1.5, 0, 1.5, 0],
      },
      {
        duration: 2.2 + Math.random() * 0.8,
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
