import { launchAgentExecution } from "@ai-matrx/chat/agents/redux/execution-system/thunks/launch-agent-execution.thunk";
import type { AppDispatch } from "@/lib/redux/store";

/**
 * The owner's planner system agent ("Master Intelligence Architect"). It has no mandate yet,
 * so the System Builder runs it by id through the canonical agent-run door AS THE PERSON
 * (their own allowance, never a service key). When a mandate is registered for it, replace
 * this constant with the mandate key (see common-docs/operations/conflicts.md).
 */
export const PLANNER_AGENT_ID = "53594e9c-ddb7-4b6f-8881-7b4d487392da";

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
        agentId: PLANNER_AGENT_ID,
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
