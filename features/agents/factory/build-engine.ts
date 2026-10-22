"use client";

/**
 * Which engine builds an agent for a door: the `agent_build` system workflow, or (only for a door whose knob
 * still says `legacy`, and for an admin's `builtin` build) the server route.
 *
 * Lane 3A-k retired the Studio switch `agent_factory.studio_build_engine`: every Studio door (describe, examples,
 * import, masterwork items) builds on the workflow. The three doors with a knob (`from_chat`,
 * `mandate_holder_draft`, `generate`) keep their `agent_factory.door_<door>` knob: `pipeline` starts the workflow;
 * `legacy` keeps the old builder and never reaches this file.
 *
 * The build view (`useBuildDetail`) reads BOTH id shapes, so an old build already started still opens.
 */

import { resolveFactoryDoor, type FactoryDoor } from "./door";

export type BuildEngine = "pipeline" | "workflow";

const KNOB_DOORS: ReadonlySet<string> = new Set<FactoryDoor>(["from_chat", "mandate_holder_draft", "generate"]);

export function hasDoorKnob(door: string | null | undefined): door is FactoryDoor {
  return Boolean(door && KNOB_DOORS.has(door));
}

/** Awaited: the engine a build started from `door` runs on. */
export async function resolveBuildEngine(door: string | null | undefined): Promise<BuildEngine> {
  if (hasDoorKnob(door)) return (await resolveFactoryDoor(door)) === "pipeline" ? "workflow" : "pipeline";
  return "workflow";
}
