// features/bindings/holder-draft-brief.ts
//
// ── THE BRIEF THE "+ AGENT" DOOR HANDS THE DRAFTING JOB ──────────────────────
//
// `mandates.holder_draft` (aidream `services/mandates/holder_draft_mandates.py`)
// drafts the agent that fulfils ONE Mandate. Its Provision,
// `mandates.holder_draft_brief`, offers exactly what the workspace already has
// in hand — the job's goal, its offered values, its output contract, who will
// own the agent and what holds the job today. This module is the ONE place
// those offered values are assembled, keyed by their declared names, so the
// launch and the declaration cannot drift apart without this file changing.
//
// Pure: no React, no reads. Jest-pinned in `__tests__/holder-draft-brief.test.ts`.

import type { MandateWorkspaceData } from "@/features/mandates/workspace/useMandateWorkspaceData";
import type { OfferedValue } from "@/features/mandates/provision-shapes";
import { splitMandateKey } from "@ai-matrx/agents/mandates";
import type { AgentOwner } from "@/features/agents/agent-creators/services/agentBuilderService";
import type { HolderDraft, WorkspaceRung } from "./ScopeHolderBar";
import { DEFAULT_HOLDER_RUNG } from "./default-holder-rung";
import { outputConstraintsOf } from "@/features/mandates/workspace/definition-output";

/** The provision's owner_scope vocabulary — the server's words, not ours. */
export type HolderDraftOwnerScope = "system" | "organization" | "user";

export interface HolderDraftBriefInput {
  data: MandateWorkspaceData;
  /** What the job offers, as the workspace resolved it (provision or described). */
  offeredValues: readonly OfferedValue[];
  /** The holder in the controls right now — the draft replaces or joins it. */
  holder: HolderDraft;
  owner: AgentOwner;
}

/**
 * WHOSE AGENT THE DOOR CREATES, from the rung it stands on — the SAME rule the
 * holder picker enforces on its list (`ScopeHolderBar.holderRestriction`):
 *
 *  · the platform-wide binding, or the job's own default when the job is homed
 *    in the system organization, runs for every user → a SYSTEM agent;
 *  · an organization's binding, or an org-homed default, runs for that
 *    organization's members → an agent that organization owns;
 *  · a person's binding → their own.
 *
 * `null` when the rung is an organization's but no organization is named yet
 * — the door cannot create an agent nobody would own, and says so.
 */
export function holderDraftOwnerOf(input: {
  rung: WorkspaceRung;
  organizationId: string | null;
  systemHomed: boolean;
}): AgentOwner | null {
  const { rung, organizationId, systemHomed } = input;
  if (rung === DEFAULT_HOLDER_RUNG) {
    if (systemHomed) return { kind: "system" };
    return organizationId ? { kind: "organization", organizationId } : null;
  }
  if (rung === "org") {
    return organizationId ? { kind: "organization", organizationId } : null;
  }
  return { kind: "user" };
}

export function ownerScopeOf(owner: AgentOwner): HolderDraftOwnerScope {
  return owner.kind;
}

/**
 * The offered values of `mandates.holder_draft_brief`, keyed by their declared
 * names. Optional values are OMITTED when the workspace has nothing honest to
 * send (never an empty string standing in for "unknown").
 */
/** What a job states about itself — the part of the brief that needs no workspace. */
export interface HolderDraftJob {
  mandateKey: string;
  label: string | null;
  goal: string | null;
  description?: string | null;
  offeredValues: ReadonlyArray<Pick<OfferedValue, "name" | "kind" | "guaranteed" | "lazy" | "description"> & { example?: string | null }>;
  acceptsUserInput?: boolean | null;
  outputKind?: string | null;
  outputConstraints?: string | null;
  requiredOutputKeys?: readonly string[];
}

/**
 * The brief for a job known only by what it states (a job just created, with
 * no workspace open — the org chart's department batch). The SAME keys
 * `buildHolderDraftBrief` sends; optional values are omitted when empty.
 */
export function buildHolderDraftBriefForJob(job: HolderDraftJob, owner: AgentOwner): Record<string, unknown> {
  const brief: Record<string, unknown> = {
    mandate_key: job.mandateKey,
    mandate_label: job.label ?? job.mandateKey,
    feature: splitMandateKey(job.mandateKey).feature,
    goal: job.goal ?? "",
    offered_values: job.offeredValues.map((value) => ({
      name: value.name,
      kind: value.kind,
      guaranteed: value.guaranteed,
      lazy: value.lazy,
      description: value.description,
      ...(value.example ? { example: value.example } : {}),
    })),
    accepts_user_input: String(job.acceptsUserInput ?? true),
    owner_scope: ownerScopeOf(owner),
  };
  const description = job.description?.trim();
  if (description) brief.description = description;
  if (job.outputKind) brief.output_kind = job.outputKind;
  const outputConstraints = job.outputConstraints?.trim();
  if (outputConstraints) brief.output_constraints = outputConstraints;
  if (job.requiredOutputKeys && job.requiredOutputKeys.length > 0) brief.required_output_keys = [...job.requiredOutputKeys];
  return brief;
}

/**
 * The offered values of `mandates.holder_draft_brief`, keyed by their declared
 * names. Optional values are OMITTED when the workspace has nothing honest to
 * send (never an empty string standing in for "unknown").
 */
export function buildHolderDraftBrief(
  input: HolderDraftBriefInput,
): Record<string, unknown> {
  const { data, offeredValues, holder, owner } = input;
  const mandate = data.mandate;
  const brief = buildHolderDraftBriefForJob(
    {
      mandateKey: mandate.mandate_key,
      label: mandate.label,
      goal: mandate.goal,
      description: mandate.description,
      offeredValues,
      acceptsUserInput: mandate.accepts_user_input,
      outputKind: mandate.output_kind,
      outputConstraints: outputConstraintsOf(mandate),
      requiredOutputKeys: data.contract.requiredOutputKeys,
    },
    owner,
  );
  if (data.pins && Object.keys(data.pins).length > 0) brief.pins = data.pins;

  const currentHolder = currentHolderOf(holder, data);
  if (currentHolder) brief.current_holder = currentHolder;
  return brief;
}

function currentHolderOf(
  holder: HolderDraft,
  data: MandateWorkspaceData,
): { kind: "agent" | "workflow"; name: string | null; agent_id?: string } | null {
  if (holder.kind === "agent" && holder.agentId) {
    return {
      kind: "agent",
      name: data.agentsById[holder.agentId]?.name ?? null,
      agent_id: holder.agentId,
    };
  }
  if (holder.kind === "workflow" && holder.workflowId) {
    return { kind: "workflow", name: null };
  }
  return null;
}
