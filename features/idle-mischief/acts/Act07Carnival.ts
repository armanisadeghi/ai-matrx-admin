// features/idle-mischief/acts/Act07Carnival.ts
//
// Chaos. Snow + Eyes + Liquify + Roll Call all firing at once. The room
// is officially full of toys.

import { playEyes } from "./Act03Eyes";
import { playSnow } from "./Act05Snow";
import { playRollCall } from "./Act09RollCall";
import { playLiquify } from "./Act10Liquify";

export function playCarnival(): () => void {
  const cleanups = [
    playSnow(),
    playEyes(),
    playLiquify(),
    playRollCall(),
  ];
  return () => {
    for (const fn of cleanups) {
      try {
        fn();
      } catch {}
    }
  };
}
