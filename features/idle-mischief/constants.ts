// features/idle-mischief/constants.ts
//
// All timings live here so the Toy-Story choreography is one file edit away.

import type { MischiefActId } from "./types";

export interface ActSchedule {
  id: MischiefActId;
  /** Seconds of inactivity before this act fires (real seconds, before speed multiplier). */
  threshold: number;
  /** How long the act runs once it starts (ms). */
  duration: number;
}

export const ACT_QUEUE: ActSchedule[] = [
  { id: "tremor", threshold: 8, duration: 1400 },
  { id: "wiggle", threshold: 14, duration: 4000 },
  { id: "eyes", threshold: 22, duration: 5000 },
  { id: "walking-sidebar", threshold: 32, duration: 5500 },
  { id: "snow", threshold: 45, duration: 6000 },
  { id: "tower-collapse", threshold: 60, duration: 3500 },
  { id: "carnival", threshold: 90, duration: 6500 },
];

export const SNAPBACK_DURATION_MS = 240;
export const ACTIVITY_THROTTLE_MS = 500;
export const MAX_TOWER_WINDOWS = 8;
