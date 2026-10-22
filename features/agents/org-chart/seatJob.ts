// features/agents/org-chart/seatJob.ts
//
// THE ONE WAY a seat gets its job (rung 2 of the open-position ladder): an
// ORGANIZATION soft mandate homed in the seat's organization, made through
// `createSoftMandate` (the one door), then linked to the seat. Its key is made
// from the seat's name, as the mandate pages make it, and the next number is
// tried when a key is taken. Used by "Define the job" and by the department
// batch, so both write exactly the same job.

"use client";

import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import { BackendApiError } from "@ai-matrx/api";
import type { AppDispatch } from "@/lib/redux/store";
import { createSoftMandate } from "@/features/mandates/authoring-level/service";
import { keyFromName, softMandateNamespace } from "@/features/mandates/authoring-level/soft-key";
import type { DraftInput } from "@/features/mandates/authoring/service";
import { loadSeatJobs, updateOrgPosition } from "@/features/agents/redux/orchestras/orgChartThunks";
import type { OrgPosition } from "./positionsService";

export interface DefinedSeatJob {
  mandateKey: AnyMandateKey;
  mandateId: string;
}

export interface SeatJobInput {
  goal: string;
  inputs: DraftInput[];
  /** What the seat hands back (the job's output constraints). */
  output?: string;
}

/** Create the seat's job and link it. Throws with the server's words. */
export async function createSeatJob(
  dispatch: AppDispatch,
  position: Pick<OrgPosition, "id" | "name" | "description" | "organizationId">,
  job: SeatJobInput,
): Promise<DefinedSeatJob> {
  const namespace = softMandateNamespace("organization");
  let attempt = 1;
  let made: Awaited<ReturnType<typeof createSoftMandate>> | null = null;
  while (!made) {
    try {
      made = await createSoftMandate(dispatch, {
        level: "organization",
        organizationId: position.organizationId,
        mandateKey: keyFromName(position.name, attempt, namespace),
        label: position.name,
        goal: job.goal.trim(),
        description: position.description ?? undefined,
        outputConstraints: job.output?.trim() || undefined,
        draftInputs: job.inputs.filter((i) => i.description.trim()),
      });
    } catch (e) {
      // A made key can belong to a job this person cannot see: try the next number.
      if (!(e instanceof BackendApiError && e.status === 409) || attempt >= 50) throw e;
      attempt += 1;
    }
  }
  const linked = await dispatch(updateOrgPosition(position.id, { mandateId: made.mandateId }));
  if (!linked.ok) throw new Error(`The job was created, but the position could not be linked to it: ${linked.error}`);
  await dispatch(loadSeatJobs([made.mandateId]));
  return { mandateKey: made.mandateKey, mandateId: made.mandateId };
}

/** The writing boxes of a seat's job (Define the job, the department plan) carry this surface. */
export const SEAT_JOB_SURFACE = "agents-org-chart";
export const seatJobScope = () => ({ context: { surface: SEAT_JOB_SURFACE } });
