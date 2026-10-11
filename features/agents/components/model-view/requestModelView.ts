import { getUserMessage } from "@ai-matrx/agents/matrx";
import { callApi } from "@/lib/api/call-api";
import { assembleManualRequest } from "@ai-matrx/chat/agents/redux/execution-system/thunks/execute-manual-instance.thunk";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { declaredNames } from "@/features/prompt-blocks/tokens";
import type { ModelViewPreview } from "./modelViewLogic";

export interface ModelViewResult {
  preview: ModelViewPreview;
  /** Variable values the draft run would send, before the author's edits. */
  baseVariables: Record<string, unknown>;
  declared: string[];
}

export const NOT_READY_MESSAGE = "Choose a model first.";

/**
 * The live-draft dry run: the SAME manual request a test run sends
 * (`assembleManualRequest` reads the unsaved definition), with the author's
 * variable edits on top, `dry_run` on and nothing stored. No model is called.
 */
export async function requestModelView(
  dispatch: AppDispatch,
  state: RootState,
  conversationId: string,
  edits: Record<string, string>,
  agentId?: string,
): Promise<ModelViewResult> {
  const payload = (await assembleManualRequest(
    state as never,
    conversationId,
  )) as Record<string, unknown> | null;
  if (!payload) throw new Error(NOT_READY_MESSAGE);
  const baseVariables = (payload.variables ?? {}) as Record<string, unknown>;
  const declared = ((payload.variable_definitions ?? []) as Array<{ name?: string }>)
    .map((d) => d.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  // The draft's declared prompt blocks ride the manual request; the server expands and reports them.
  const promptBlocks = agentId
    ? declaredNames(
        (state.agentDefinition.agents[agentId] as { promptBlocks?: unknown } | undefined)?.promptBlocks,
      )
    : [];
  const result = await dispatch(
    callApi({
      path: "/ai/manual",
      method: "POST",
      body: {
        ...payload,
        variables: { ...baseVariables, ...edits },
        ...(promptBlocks.length > 0 ? { prompt_blocks: promptBlocks } : {}),
        dry_run: true,
        stream: false,
        store: false,
        source_app: "matrx-frontend",
        source_feature: "agent-builder",
        initiation: "user",
      } as never,
      expectedErrorStatuses: [400, 422],
    }),
  );
  if (result.error) {
    throw new Error(getUserMessage(result.error));
  }
  return { preview: result.data as ModelViewPreview, baseVariables, declared };
}
