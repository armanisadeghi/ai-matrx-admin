// features/idle-mischief/acts/Act02Wiggle.ts
//
// Pick 4-6 buttons; each gets a gentle sinusoidal float with a random phase.
// They look like they can't quite hold still — fidgety, alive.

import { animate } from "motion";
import { findButtons } from "../utils/targets";
import { rememberTransform, restoreTransform } from "../utils/snapBack";

export function playWiggle(): () => void {
  const targets = findButtons(6);
  if (targets.length === 0) return () => {};

  const handles = targets.map((el) => {
    rememberTransform(el);
    const phaseDelay = Math.random() * 0.8;
    const yAmp = 2 + Math.random() * 1.5;
    return animate(
      el,
      { y: [0, -yAmp, 0, yAmp, 0], rotate: [0, -1.5, 0, 1.5, 0] },
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
    for (const el of targets) restoreTransform(el);
  };
}
