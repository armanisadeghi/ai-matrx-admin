// features/idle-mischief/constants.ts
//
// All timings live here so the choreography is one file edit away.

import type { MischiefActId } from "./types";

export interface ActSchedule {
  id: MischiefActId;
  /** Seconds of inactivity before this act fires (real seconds, before speed multiplier). */
  threshold: number;
  /** How long the act runs once it starts (ms). */
  duration: number;
}

// Order matters — this is the queue. Acts fire in order as idle time grows.
// Snap-back instantly resets the playhead.
export const ACT_QUEUE: ActSchedule[] = [
  { id: "tremor", threshold: 8, duration: 1400 },
  { id: "roll-call", threshold: 14, duration: 4500 },
  { id: "wiggle", threshold: 20, duration: 4000 },
  { id: "eyes", threshold: 28, duration: 6000 },
  { id: "liquify", threshold: 38, duration: 4500 },
  { id: "walking-sidebar", threshold: 48, duration: 5500 },
  { id: "avalanche", threshold: 60, duration: 4500 },
  { id: "snow", threshold: 75, duration: 6000 },
  { id: "tower-collapse", threshold: 90, duration: 3500 },
  { id: "carnival", threshold: 110, duration: 7000 },
];

export const SNAPBACK_DURATION_MS = 240;
export const ACTIVITY_THROTTLE_MS = 500;
export const MAX_TOWER_WINDOWS = 8;
