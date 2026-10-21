"use client";

/**
 * Which engine builds an agent for a door: the old Agent Factory pipeline, or the `agent_build`
 * system workflow (Agent Studio rebuild, lane 3B).
 *
 * THE SWITCH, in one place, read through a knob (never a constant):
 *  - the three doors that have a knob (`from_chat`, `mandate_holder_draft`, `generate`): their
 *    `agent_factory.door_<door>` knob. `pipeline` starts the workflow; `legacy` keeps the old
 *    builder and never reaches this file;
 *  - every other door (Studio: describe, examples, import, masterwork items) has no door knob by the
 *    owner's ruling. Its one explicit switch is `agent_factory.studio_build_engine`
 *    (`pipeline` = the old pipeline, the registered default | `workflow`). It is flipped only after
 *    the live walk of the new build view passes; until then every Studio build is the old pipeline.
 *
 * The build view (`useBuildDetail`) reads BOTH id shapes whatever this says, so flipping the
 * switch back never strands a build already started.
 */

import { resolveSessionKnob, useSessionKnob } from "@/lib/scoped-config/sessionKnob";
import { resolveFactoryDoor, type FactoryDoor } from "./door";

export type BuildEngine = "pipeline" | "workflow";

export const STUDIO_ENGINE_KNOB = { feature: "agent_factory", key: "studio_build_engine" } as const;

const KNOB_DOORS: ReadonlySet<string> = new Set<FactoryDoor>(["from_chat", "mandate_holder_draft", "generate"]);

/** Anything but an exact `workflow` keeps the old pipeline, including "not answered yet". */
export function asBuildEngine(value: unknown): BuildEngine {
  return value === "workflow" ? "workflow" : "pipeline";
}

export function hasDoorKnob(door: string | null | undefined): door is FactoryDoor {
  return Boolean(door && KNOB_DOORS.has(door));
}

/** React: the Studio doors' engine for the signed-in person. */
export function useStudioBuildEngine(): BuildEngine {
  return asBuildEngine(useSessionKnob(STUDIO_ENGINE_KNOB));
}

/** Awaited: the engine a build started from `door` runs on. */
export async function resolveBuildEngine(door: string | null | undefined): Promise<BuildEngine> {
  if (hasDoorKnob(door)) return (await resolveFactoryDoor(door)) === "pipeline" ? "workflow" : "pipeline";
  return asBuildEngine(await resolveSessionKnob(STUDIO_ENGINE_KNOB));
}
