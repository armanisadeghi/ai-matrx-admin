// features/idle-mischief/types.ts
//
// Shared types for the idle-mischief subsystem.

export type MischiefActId =
  | "tremor"
  | "wiggle"
  | "eyes"
  | "walking-sidebar"
  | "snow"
  | "tower-collapse"
  | "carnival";

export type MischiefStatus = "idle" | "playing" | "snapping-back";

export interface MischiefSettings {
  /** Master enable; respected even in dev. */
  enabled: boolean;
  /** Time multiplier — 1 is normal, 4 means thresholds fire 4x sooner. */
  speed: number;
  /** When the queue ends, restart from the top. */
  loop: boolean;
}
