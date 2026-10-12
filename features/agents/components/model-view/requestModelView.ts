import { getUserMessage } from "@ai-matrx/api";
import { callApi } from "@/lib/api/call-api";
import { assembleManualRequest } from "@ai-matrx/chat/agents/redux/execution-system/thunks/execute-manual-instance.thunk";
import { refreshSurfaceScope } from "@ai-matrx/chat/agents/redux/execution-system/thunks/refresh-surface-scope.thunk";
import { ensureContextRulesReady } from "@ai-matrx/chat/agents/redux/execution-system/context-rules/context-rules.thunks";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { declaredNames } from "@/features/prompt-blocks/tokens";
import type { ModelViewPreview } from "./modelViewLogic";

export const NOT_READY_MESSAGE = "Choose a model first.";

/**
 * The live-draft capture: the SAME manual request a test run sends — the
 * unsaved definition, what is typed in the composer, the variable values and
 * the context, prepared by the same two steps a run takes first — with
 * `dry_run` on. The server runs every step of the real run and returns the
 * provider request it would send, without sending it or storing anything.
 */
export async function requestModelView(
  dispatch: AppDispatch,
  getState: () => RootState,
  conversationId: string,
  agentId?: string,
  signal?: AbortSignal,
): Promise<ModelViewPreview> {
  // A run refreshes the surface scope and loads the context rules before it
  // assembles; without them the context the person set never reaches the request.
  await dispatch(refreshSurfaceScope({ conversationId }) as never);
  await dispatch(ensureContextRulesReady(conversationId) as never);
  if (signal?.aborted) throw new DOMException("Superseded", "AbortError");
  const state = getState();
  const payload = (await assembleManualRequest(state as never, conversationId)) as Record<
    string,
    unknown
  > | null;
  if (!payload) throw new Error(NOT_READY_MESSAGE);
  // The draft's declared prompt blocks ride the request. The shared assembler (the real
  // Test run's) sends them itself; for an assembler that predates that, the same names
  // are read from the draft here, so the Model view and the run send one definition.
  const promptBlocks: string[] =
    Array.isArray(payload.prompt_blocks) && payload.prompt_blocks.length > 0
      ? (payload.prompt_blocks as string[])
      : agentId
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
        ...(promptBlocks.length > 0 ? { prompt_blocks: promptBlocks } : {}),
        // The payload's own `stream` and `store` stay: the wire carries them. The
        // server makes a dry run ephemeral itself.
        dry_run: true,
      } as never,
      signal,
      expectedErrorStatuses: [400, 422],
    }),
  );
  if (result.error) {
    throw new Error(getUserMessage(result.error));
  }
  const data = result.data as ModelViewPreview | null;
  // A server older than the capture door answers 200 without the captured request:
  // say so rather than draw an empty view.
  if (!data || typeof data !== "object" || !("request" in data) || !data.request) {
    throw new Error(SERVER_BEHIND_MESSAGE);
  }
  return data;
}

export const SERVER_BEHIND_MESSAGE = "This server can't capture the request yet.";
