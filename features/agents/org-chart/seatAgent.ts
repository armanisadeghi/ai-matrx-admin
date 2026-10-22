// features/agents/org-chart/seatAgent.ts
//
// Rung 4 of the open-position ladder without a window open: build the agent
// that does a seat's job and make it the job's Holder, so the seat reads
// "Agent at work". The SAME three parts the mandate window's Create Agent tab
// uses — the drafting job `mandates.holder_draft` (brief from
// `buildHolderDraftBriefForJob`, the one brief builder), `createAgentFromBuilder`
// (whose agent: the seat's organization), and the job's own default holder
// (`putMandateDefaultHolder`). Used by the department batch, one seat at a time.

"use client";

import { MANDATE_KEYS, type AnyMandateKey } from "@ai-matrx/agents/mandates";
import type { UseHeadlessAgentJson } from "@ai-matrx/chat/agents/hooks/useHeadlessAgentJson";
import type { AppDispatch } from "@/lib/redux/store";
import { createAgentFromBuilder } from "@/features/agents/agent-creators/services/agentBuilderService";
import { extractAgentConfig, extractAgentName } from "@/features/agents/agent-creators/utils/agent-config-extractor";
import { buildHolderDraftBriefForJob } from "@/features/bindings/holder-draft-brief";
import { agentDefaultHolder, putMandateDefaultHolder } from "@/features/mandates/overrides";
import { loadSeatJobs } from "@/features/agents/redux/orchestras/orgChartThunks";

export const HOLDER_DRAFT_MANDATE_KEY = MANDATE_KEYS.mandates__holder_draft;

export interface SeatAgentJob {
  mandateKey: AnyMandateKey;
  mandateId: string;
  organizationId: string;
  seatName: string;
  description?: string | null;
  goal: string;
  output?: string | null;
  inputs: Array<{ name?: string; description: string; required?: boolean }>;
}

/** The agent exists but did not take the job: a retry passes `agentId` and only re-binds. */
export class SeatAgentNotBoundError extends Error {
  constructor(
    message: string,
    readonly agentId: string,
  ) {
    super(message);
  }
}

/**
 * Build the seat's agent and make it the job's Holder. Returns the agent id;
 * throws with the reason. `agentId` (from a `SeatAgentNotBoundError`) skips
 * the drafting, so a retry never makes a second agent.
 */
export async function buildSeatAgent(
  dispatch: AppDispatch,
  run: UseHeadlessAgentJson["run"],
  job: SeatAgentJob,
  agentId?: string,
): Promise<string> {
  const id = agentId ?? (await draftSeatAgent(run, job));
  try {
    await putMandateDefaultHolder(dispatch, job.mandateKey, agentDefaultHolder(id));
  } catch (e) {
    throw new SeatAgentNotBoundError(
      `The agent was created but could not take the job: ${e instanceof Error ? e.message : "unknown reason"}`,
      id,
    );
  }
  await dispatch(loadSeatJobs([job.mandateId]));
  return id;
}

async function draftSeatAgent(run: UseHeadlessAgentJson["run"], job: SeatAgentJob): Promise<string> {
  const owner = { kind: "organization" as const, organizationId: job.organizationId };
  const variables = buildHolderDraftBriefForJob(
    {
      mandateKey: job.mandateKey,
      label: job.seatName,
      goal: job.goal,
      description: job.description,
      offeredValues: job.inputs.map((i, n) => ({
        name: i.name?.trim() || `input_${n + 1}`,
        kind: "text",
        guaranteed: i.required !== false,
        lazy: false,
        description: i.description,
      })),
      acceptsUserInput: true,
      outputConstraints: job.output,
    },
    owner,
  );
  const draft = await run<unknown>({
    mandateKey: HOLDER_DRAFT_MANDATE_KEY,
    surfaceKey: `mandate:${HOLDER_DRAFT_MANDATE_KEY}`,
    sourceFeature: "agent-generator",
    expect: "json",
    initiation: "user",
    surfaceName: null,
    organizationId: job.organizationId,
    variables,
  });
  const config = extractAgentConfig(draft);
  if (!config) throw new Error("The drafted agent could not be read. Try again.");
  const created = await createAgentFromBuilder({ ...config, name: extractAgentName(draft) ?? job.seatName }, owner);
  if (!created.success || !created.agentId) throw new Error(created.error ?? "The agent could not be saved.");
  return created.agentId;
}
