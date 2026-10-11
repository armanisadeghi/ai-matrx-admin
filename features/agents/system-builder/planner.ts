import { launchAgentExecution } from "@ai-matrx/chat/agents/redux/execution-system/thunks/launch-agent-execution.thunk";
import type { AppDispatch } from "@/lib/redux/store";

import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";

/**
 * The planner is a Mandate (`agent_factory.system_plan`, declared in aidream
 * `services/mandates/client_mandates.py`): which agent plans is the mandate's
 * Holder, never an id in this file. The page offers one value, `intelligence_description`.
 */
export const PLANNER_MANDATE_KEY = MANDATE_KEYS.agent_factory__system_plan;

export class PlannerRefused extends Error {}

export async function runPlanner(
  dispatch: AppDispatch,
  description: string,
  onConversation?: (conversationId: string) => void,
): Promise<{ answer: string; conversationId: string }> {
  let launch;
  try {
    launch = await dispatch(
      launchAgentExecution({
        mandateKey: PLANNER_MANDATE_KEY,
        surfaceKey: "system-builder",
        sourceFeature: "agent-generator",
        isEphemeral: false,
        autoClearConversation: false,
        onConversationCreated: onConversation,
        config: { displayMode: "direct", autoRun: true, allowChat: false, hideReasoning: true },
        runtime: { variables: { intelligence_description: description } },
      }),
    ).unwrap();
  } catch (e) {
    const detail =
      e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "the run did not start";
    throw new PlannerRefused(detail);
  }
  const answer = (launch.responseText ?? "").trim();
  if (!answer) throw new PlannerRefused("The Architect returned no answer. Nothing was saved.");
  return { answer, conversationId: launch.conversationId };
}
