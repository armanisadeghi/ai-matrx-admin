// features/idle-mischief/acts/index.ts
//
// Central registry mapping ActId → playFn. The orchestrator looks up here.

import type { MischiefActId } from "../types";
import { playTremor } from "./Act01Tremor";
import { playWiggle } from "./Act02Wiggle";
import { playEyes } from "./Act03Eyes";
import { playWalkingSidebar } from "./Act04WalkingSidebar";
import { playSnow } from "./Act05Snow";
import { playTowerCollapse } from "./Act06TowerCollapse";
import { playCarnival } from "./Act07Carnival";

export const ACT_PLAYERS: Record<MischiefActId, () => () => void> = {
  tremor: playTremor,
  wiggle: playWiggle,
  eyes: playEyes,
  "walking-sidebar": playWalkingSidebar,
  snow: playSnow,
  "tower-collapse": playTowerCollapse,
  carnival: playCarnival,
};
