import type { AppDispatch } from "@/lib/redux/store";
import { callApi } from "@/lib/api/call-api";
import { followServerWork } from "@/features/ai-watch/followed-work";
import type { WorkspaceInput } from "./workspace";

type ApiResult = { data?: unknown; error?: { message?: string } };

/** The mandate the Studio's one assistant runs through (aidream `agent_studio/mandates.py`). */
export const STUDIO_ASSISTANT_MANDATE = "agent_studio.do_the_job_together";
/** The surface the server resolves the assistant's tool defaults (studio_workspace) from. */
export const STUDIO_SURFACE_NAME = "matrx-user/agent-studio";

function failure(result: ApiResult, fallback: string): Error {
  const e = result.error as { message?: string; detail?: { message?: string } } | undefined;
  return new Error(e?.detail?.message ?? e?.message ?? fallback);
}

/** "Make this an agent": the workspace (read on the server from the conversation) goes to the Agent Factory. */
export async function buildFromWorkspace(
  dispatch: AppDispatch,
  conversationId: string,
  acceptedInputs: WorkspaceInput[],
): Promise<{ buildId: string; says: string; proofCases: number }> {
  const result = (await dispatch(
    callApi({
      path: "/agent-studio/from-workspace" as never,
      method: "POST",
      body: { conversation_id: conversationId, accepted_inputs: acceptedInputs } as never,
    }),
  )) as ApiResult;
  if (result.error) throw failure(result, "The build did not start");
  const d = (result.data ?? {}) as { build_id?: string; says?: string; proof_cases?: number };
  if (!d.build_id) throw new Error("No build came back");
  // The build runs detached on the server: Watch AI and the Builder panel follow it through the shared door.
  followServerWork({ kind: "factory_build", id: d.build_id, label: "Agent Factory build · Studio", source: "Studio" });
  return { buildId: d.build_id, says: d.says ?? "", proofCases: d.proof_cases ?? 0 };
}

export interface MissedInputsAnswer {
  checked: boolean;
  reason: string;
  suggestions: WorkspaceInput[];
}

/** The optional "inputs we may have missed" check (Feature Knob agent_studio.missed_inputs_check). Suggestions only. */
export async function checkMissedInputs(dispatch: AppDispatch, conversationId: string): Promise<MissedInputsAnswer> {
  const result = (await dispatch(
    callApi({
      path: "/agent-studio/missed-inputs" as never,
      method: "POST",
      body: { conversation_id: conversationId } as never,
    }),
  )) as ApiResult;
  if (result.error) throw failure(result, "The check did not run");
  const d = (result.data ?? {}) as Partial<MissedInputsAnswer>;
  return { checked: Boolean(d.checked), reason: d.reason ?? "", suggestions: d.suggestions ?? [] };
}
