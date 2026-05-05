// features/idle-mischief/types.ts

export type MischiefActId =
  | "tremor"
  | "wiggle"
  | "eyes"
  | "walking-sidebar"
  | "snow"
  | "tower-collapse"
  | "carnival"
  | "avalanche"
  | "roll-call"
  | "liquify";

export type MischiefStatus = "idle" | "playing" | "snapping-back";

export interface MischiefSettings {
  enabled: boolean;
  speed: number;
  loop: boolean;
}
