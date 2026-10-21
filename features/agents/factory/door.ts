"use client";

/**
 * Which builder an agent-creating door uses — its Feature Knob
 * `agent_factory.door_<door>` (`legacy` | `pipeline`, REGISTER R33), resolved for this
 * person in their active organization (`platform.knob_resolve`, org → user, nearest wins).
 * `pipeline` = an Agent Factory build through the server (BuildProgress); anything else,
 * including "not answered yet", keeps today's builder.
 *
 * `pipeline` now starts the `agent_build` workflow (see `build-engine.ts`). There is no local
 * override: a door is checked by setting its real knob.
 */

import { resolveSessionKnob, useSessionKnob } from "@/lib/scoped-config/sessionKnob";

export type FactoryDoor = "from_chat" | "mandate_holder_draft" | "generate";
export type BuildPath = "legacy" | "pipeline";

export function asBuildPath(value: unknown): BuildPath {
  return value === "pipeline" ? "pipeline" : "legacy";
}

function knobRef(door: FactoryDoor) {
  return { feature: "agent_factory", key: `door_${door}` };
}

/** React: this door's path for the signed-in person; `legacy` until the knob answers. */
export function useFactoryDoor(door: FactoryDoor): BuildPath {
  return asBuildPath(useSessionKnob(knobRef(door)));
}

/** Awaited: this door's path for the signed-in person. */
export async function resolveFactoryDoor(door: FactoryDoor): Promise<BuildPath> {
  return asBuildPath(await resolveSessionKnob(knobRef(door)));
}
