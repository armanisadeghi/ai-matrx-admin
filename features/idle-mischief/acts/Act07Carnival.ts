// features/idle-mischief/acts/Act07Carnival.ts
//
// Chaos. Run wiggle + eyes + snow at the same time. No hierarchy, no plan,
// just a room full of toys having the time of their lives.

import { playWiggle } from "./Act02Wiggle";
import { playEyes } from "./Act03Eyes";
import { playSnow } from "./Act05Snow";

export function playCarnival(): () => void {
  const cleanups = [playWiggle(), playEyes(), playSnow()];
  return () => {
    for (const fn of cleanups) {
      try {
        fn();
      } catch {}
    }
  };
}
