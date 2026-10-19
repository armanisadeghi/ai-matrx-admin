// features/notes/service/noteEditHold.ts
//
// A PERSON's note edits follow the simultaneous-edit rule (context passthrough, ORCHESTRA.md):
// while an agent of an Orchestra holds a note for its turn, the database refuses a person's
// content save with PT423 (`platform.record_edit_hold_on_person_write`). Every browser writer of
// `workbench.notes.content` runs its save through `whileAgentHoldsTheNote`: wait for the hold to
// clear, then save — a version miss then is the writer's ordinary conflict path (re-read, merge).

import { supabase } from "@/utils/supabase/client";
import { operationFailed } from "@/utils/errors";

/** The database's answer while an agent holds a note for its turn. */
export function isEditHeld(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "PT423";
}

async function knob(key: string, organizationId: string | null): Promise<number | null> {
  const { data, error } = await supabase.schema("platform").rpc("knob_resolve", {
    p_feature: "agents.context",
    p_key: key,
    // An org-less writer reads the platform value (the knob is platform-locked).
    p_organization_id: organizationId as string,
  });
  return error || typeof data !== "number" ? null : data;
}

/**
 * Run a note save; while an agent holds the note (PT423), wait and try again — for at most the
 * `agents.context` / `edit_hold_wait_seconds` knob, looking every `edit_hold_poll_ms` (the knobs
 * the server's agents wait by). Past the limit the refusal stands, in words. `save` must throw
 * the PostgREST error (a supabase result's `error`) for the hold to be seen.
 */
export async function whileAgentHoldsTheNote<T>(organizationId: string | null, save: () => Promise<T>): Promise<T> {
  let deadline: number | null = null;
  let pollMs = 0;
  for (;;) {
    try {
      return await save();
    } catch (error) {
      if (!isEditHeld(error)) throw error;
      if (deadline === null) {
        const [wait, poll] = await Promise.all([
          knob("edit_hold_wait_seconds", organizationId),
          knob("edit_hold_poll_ms", organizationId),
        ]);
        if (wait === null || poll === null) throw error;
        deadline = Date.now() + wait * 1000;
        pollMs = poll;
      }
      if (Date.now() >= deadline) {
        throw operationFailed("save this note — an agent is still editing it; try again in a moment");
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }
}

/** A supabase result whose `error` is the hold becomes a thrown error the wait can see. */
export function throwIfHeld<R extends { error: unknown }>(result: R): R {
  if (isEditHeld(result.error)) throw result.error;
  return result;
}
