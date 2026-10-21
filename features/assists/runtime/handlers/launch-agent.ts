/**
 * `launch_agent` — accepting the assist opens the shared agent-run window,
 * pre-filled with the composed intent (pre-fill only; the user reviews and
 * sends). The agent comes from a direct id or an agent-mandate key resolved at
 * click time (swappable from /mandates, no deploy).
 */

import { resolveMandate } from "@ai-matrx/chat/mandates/service";
import type { ProvisionKey } from "@ai-matrx/agents/generated/provision-offers";
import { provideHostValues } from "@ai-matrx/chat/mandates/host-values/host-values";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import type {
  AssistActionDefinition,
  AssistActionResult,
} from "../assist-action-types";

/** An unsent chip launch forgets its held values after this long. */
const HOST_VALUES_TTL_MS = 30 * 60 * 1000;

export const launchAgentAssistAction: AssistActionDefinition = {
  label: "Open agent",
  kind: "launch_agent",
  description:
    "Open the floating agent-run window pre-filled with the assist's intent (agentId or mandateKey).",
  handler: async (assist, ctx): Promise<AssistActionResult> => {
    if (assist.action.kind !== "launch_agent") {
      return { ok: false, error: "launch_agent: wrong action payload" };
    }
    const { agentId, agentName, draftText, variableValues, hostValues } = assist.action;
    const mandateKey: AnyMandateKey | undefined = assist.action.mandateKey;
    let resolvedAgentId = agentId ?? null;
    if (!resolvedAgentId && mandateKey) {
      // Resolution refuses in words — an unknown job, a version-pinned winner,
      // a non-agent Holder, or no workspace selected yet (which agent runs a
      // job depends on the active organization, so there is no honest answer
      // before one is chosen). Every one of those is a real outcome this assist
      // must SHOW, so it becomes a structured refusal like the branch below
      // rather than an unhandled rejection with nothing on screen.
      try {
        const resolved = await resolveMandate(mandateKey);
        resolvedAgentId = resolved.agentId;
      } catch (error) {
        return {
          ok: false,
          error: `launch_agent: "${mandateKey}" could not be resolved — ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    }
    if (!resolvedAgentId) {
      return {
        ok: false,
        error: "launch_agent: assist carries neither agentId nor mandateKey",
      };
    }
    if (mandateKey && hostValues) {
      // The chip's held values ride the run's first turn as the mandate's
      // offered values (mandate door only — the run window below carries the key).
      provideHostValues(
        mandateKey,
        hostValues.provision as ProvisionKey,
        () => hostValues.values,
        { once: true, ttlMs: HOST_VALUES_TTL_MS },
      );
    }
    ctx.openAgentRun({
      initialAgentId: resolvedAgentId,
      initialAgentName: agentName ?? null,
      initialDraftText: draftText ?? null,
      initialVariableValues: variableValues ?? null,
      // THE MANDATE DOOR: turn 1 POSTs `/ai/mandates/{key}`, so the offered
      // values reach the binding's consumption map (and never an agent by name).
      mandateKey: mandateKey ?? null,
    });
    return { ok: true, result: { agentId: resolvedAgentId } };
  },
};
