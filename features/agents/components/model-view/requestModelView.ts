import { getUserMessage } from "@ai-matrx/agents/matrx";
import { callApi } from "@/lib/api/call-api";
import { assembleManualRequest } from "@ai-matrx/chat/agents/redux/execution-system/thunks/execute-manual-instance.thunk";
import type { AppDispatch, RootState } from "@/lib/redux/store";
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
  const result = await dispatch(
    callApi({
      path: "/ai/manual",
      method: "POST",
      body: {
        ...payload,
        variables: { ...baseVariables, ...edits },
        dry_run: true,
        stream: false,
        store: false,
      } as never,
      expectedErrorStatuses: [400, 422],
    }),
  );
  if (result.error) {
    throw new Error(getUserMessage(result.error));
  }
  return { preview: result.data as ModelViewPreview, baseVariables, declared };
}
