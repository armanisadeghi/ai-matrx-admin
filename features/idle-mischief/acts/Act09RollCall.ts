// features/idle-mischief/acts/Act09RollCall.ts
//
// Every visible button bounces in sequence — like soldiers calling out
// "Here!" one after another. A wave that travels across the screen.

import { animate } from "motion";
import { findButtonsInOrder } from "../utils/targets";
import { snapshot } from "../utils/snapshot";

export function playRollCall(): () => void {
  const targets = findButtonsInOrder(40);
  if (targets.length === 0) return () => {};

  const handles = targets.map((el, i) => {
    snapshot(el);
    const stagger = i * 0.06; // 60ms between each
    return animate(
      el,
      {
        scale: [1, 1.25, 0.92, 1.05, 1],
        y: [0, -12, 4, -3, 0],
        rotate: [0, -6, 4, -2, 0],
      },
      {
        duration: 0.7,
        delay: stagger,
        ease: "easeOut",
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
