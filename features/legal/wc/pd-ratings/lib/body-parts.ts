import type { BodyPart } from "../types";

export const BODY_PARTS: BodyPart[] = [
  { value: "arm", label: "Arm", maxWeeks: 240, group: "Upper Extremity" },
  { value: "shoulder", label: "Shoulder", maxWeeks: 240, group: "Upper Extremity" },
  { value: "elbow", label: "Elbow", maxWeeks: 200, group: "Upper Extremity" },
  { value: "forearm", label: "Forearm", maxWeeks: 200, group: "Upper Extremity" },
  { value: "wrist", label: "Wrist", maxWeeks: 180, group: "Upper Extremity" },
  { value: "hand", label: "Hand", maxWeeks: 175, group: "Upper Extremity" },
  { value: "thumb", label: "Thumb", maxWeeks: 75, group: "Upper Extremity" },
  { value: "index-finger", label: "Index Finger", maxWeeks: 45, group: "Upper Extremity" },
  { value: "middle-finger", label: "Middle Finger", maxWeeks: 35, group: "Upper Extremity" },
  { value: "ring-finger", label: "Ring Finger", maxWeeks: 25, group: "Upper Extremity" },
  { value: "little-finger", label: "Little Finger", maxWeeks: 20, group: "Upper Extremity" },

  { value: "leg", label: "Leg", maxWeeks: 200, group: "Lower Extremity" },
  { value: "hip", label: "Hip", maxWeeks: 220, group: "Lower Extremity" },
  { value: "knee", label: "Knee", maxWeeks: 200, group: "Lower Extremity" },
  { value: "ankle", label: "Ankle", maxWeeks: 150, group: "Lower Extremity" },
  { value: "foot", label: "Foot", maxWeeks: 144, group: "Lower Extremity" },
  { value: "great-toe", label: "Great Toe", maxWeeks: 35, group: "Lower Extremity" },
  { value: "other-toe", label: "Other Toe", maxWeeks: 10, group: "Lower Extremity" },

  { value: "eye", label: "Eye (vision loss)", maxWeeks: 140, group: "Vision & Hearing" },
  { value: "ear-one", label: "Ear (hearing loss, one)", maxWeeks: 70, group: "Vision & Hearing" },
  { value: "ear-both", label: "Ears (hearing loss, both)", maxWeeks: 200, group: "Vision & Hearing" },

  { value: "back", label: "Back", maxWeeks: 300, group: "Spine & Trunk" },
  { value: "neck", label: "Neck", maxWeeks: 240, group: "Spine & Trunk" },
  { value: "spine", label: "Spine", maxWeeks: 300, group: "Spine & Trunk" },

  { value: "psychiatric", label: "Psychiatric", maxWeeks: 200, group: "Other" },
  { value: "internal", label: "Internal Organ", maxWeeks: 200, group: "Other" },
  { value: "skin", label: "Skin / Disfigurement", maxWeeks: 100, group: "Other" },
  { value: "respiratory", label: "Respiratory", maxWeeks: 200, group: "Other" },
];
