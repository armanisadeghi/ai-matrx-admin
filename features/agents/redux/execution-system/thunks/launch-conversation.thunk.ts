/**
 * launchConversation — unified entry point for every invocation path.
 *
 * Accepts a `ConversationInvocation` (the locked Phase 0 contract) and drives
 * the existing execution machinery. Every surface — Chat, Runner, Shortcut,
 * App, Builder — funnels through this thunk. There is no other way to start
 * an agent conversation from the client.
 *
 * During the migration, this thunk:
 *   1. Resolves CallbackManager ids referenced by `callbacks.*Id` (the
 *      invocation itself is serializable; function refs live in
 *      CallbackManager and are looked up by id only — never by "context").
 *   2. Adapts the grouped invocation into the flat `ManagedAgentOptions` the
 *      existing `launchAgentExecution` accepts.
 *   3. Delegates. Once the legacy flat shape is retired (Phase 4), the
 *      conversion step drops and this becomes the real implementation.
 *
 * Ephemeral routing (no DB writes) is flagged in the adapter so the execution
 * path can branch to the stateless endpoints. The full ephemeral plumbing
 * lands when the backend exposes `/ai/agents/{id}` with `is_new:false,
 * store:false` and `/ai/chat` with an explicit history payload; this thunk
 * is where the branch is wired.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import type { ConversationInvocation } from "@/features/agents/types/conversation-invocation.types";
import type {
  ManagedAgentOptions,
  ApiEndpointMode,
} from "@/features/agents/types/instance.types";
import { callbackManager } from "@/utils/callbackManager";
import {
  launchAgentExecution,
  type LaunchResult,
} from "./launch-agent-execution.thunk";

// =============================================================================
// ConversationInvocation → ManagedAgentOptions adapter
// =============================================================================

/**
 * Maps the grouped `ConversationInvocation` shape onto the flat
 * `ManagedAgentOptions` shape the current execution thunk accepts. This is
 * the translation layer that lets the new contract ship without rewriting
 * every downstream consumer in one go.
 */
function invocationToManagedOptions(
  invocation: ConversationInvocation,
): ManagedAgentOptions {
  const {
    identity,
    engine,
    routing,
    origin,
    inputs,
    scope,
    display,
    behavior,
    callbacks,
  } = invocation;

  // Both "manual" and the legacy "chat" now resolve to POST /ai/manual at
  // the endpoint boundary (see `lib/api/endpoints.ts`). Pass "manual"
  // through unchanged — the widened ManagedAgentOptions.apiEndpointMode
  // type accepts it directly. Emit "agent" or "manual" only; "chat" is no
  // longer produced by new code paths.
  const forwardedApiEndpointMode: ApiEndpointMode =
    routing.apiEndpointMode === "manual" ? "manual" : "agent";

  // Resolve CallbackManager ids into thin wrappers that fire exactly once.
  // `callbackManager.trigger(id, data)` invokes the registered function and
  // removes the entry — matching the one-shot semantics every launch site
  // expects. Ids are the only reference; there is no context/type lookup.
  const makeUnary =
    <T>(id: string | undefined) =>
    (data: T): void => {
      if (id) callbackManager.trigger<T>(id, data);
    };

  const onComplete = callbacks?.onCompleteId
    ? makeUnary<LaunchResult>(callbacks.onCompleteId)
    : undefined;
  const onTextReplace = callbacks?.onTextReplaceId
    ? makeUnary<string>(callbacks.onTextReplaceId)
    : undefined;
  const onTextInsertBefore = callbacks?.onTextInsertBeforeId
    ? makeUnary<string>(callbacks.onTextInsertBeforeId)
    : undefined;
  const onTextInsertAfter = callbacks?.onTextInsertAfterId
    ? makeUnary<string>(callbacks.onTextInsertAfterId)
    : undefined;

  const managed: ManagedAgentOptions = {
    surfaceKey: identity.surfaceKey,
    sourceFeature: origin.sourceFeature,

    // Engine resolution
    ...(engine.kind === "agent" && engine.agentId
      ? { agentId: engine.agentId }
      : {}),
    ...(engine.kind === "shortcut" && engine.shortcutId
      ? { shortcutId: engine.shortcutId, agentId: engine.agentId }
      : {}),
    ...(engine.kind === "manual" && engine.manual
      ? { manual: engine.manual }
      : {}),

    // Routing
    apiEndpointMode: forwardedApiEndpointMode,

    // Ephemeral — stamped onto the conversation record; execute thunks
    // branch on `instance.isEphemeral` to select endpoints + store flags.
    ...(origin.isEphemeral !== undefined
      ? { isEphemeral: origin.isEphemeral }
      : {}),

    // Scope
    ...(scope?.applicationScope !== undefined
      ? { applicationScope: scope.applicationScope }
      : {}),

    // Inputs
    ...(inputs?.variables !== undefined ? { variables: inputs.variables } : {}),
    ...(inputs?.userInput !== undefined ? { userInput: inputs.userInput } : {}),
    ...(inputs?.overrides !== undefined ? { overrides: inputs.overrides } : {}),

    // Display
    ...(display?.displayMode !== undefined
      ? { displayMode: display.displayMode }
      : {}),
    ...(display?.variableInputStyle !== undefined
      ? { variableInputStyle: display.variableInputStyle }
      : {}),
    ...(display?.showVariablePanel !== undefined
      ? { showVariablePanel: display.showVariablePanel }
      : {}),
    ...(display?.showDefinitionMessages !== undefined
      ? { showDefinitionMessages: display.showDefinitionMessages }
      : {}),
    ...(display?.showDefinitionMessageContent !== undefined
      ? { showDefinitionMessageContent: display.showDefinitionMessageContent }
      : {}),
    ...(display?.hideReasoning !== undefined
      ? { hideReasoning: display.hideReasoning }
      : {}),
    ...(display?.hideToolResults !== undefined
      ? { hideToolResults: display.hideToolResults }
      : {}),
    ...(display?.showAutoClearToggle !== undefined
      ? { showAutoClearToggle: display.showAutoClearToggle }
      : {}),
    ...(display?.autoClearConversation !== undefined
      ? { autoClearConversation: display.autoClearConversation }
      : {}),
    ...(display?.preExecutionMessage !== undefined
      ? { preExecutionMessage: display.preExecutionMessage }
      : {}),

    // Behavior
    ...(behavior?.allowChat !== undefined
      ? { allowChat: behavior.allowChat }
      : {}),
    ...(behavior?.autoRun !== undefined ? { autoRun: behavior.autoRun } : {}),
    ...(behavior?.usePreExecutionInput !== undefined
      ? { usePreExecutionInput: behavior.usePreExecutionInput }
      : {}),
    ...(behavior?.jsonExtraction !== undefined
      ? { jsonExtraction: behavior.jsonExtraction }
      : {}),

    // Callbacks (resolved above)
    ...(onComplete ? { onComplete } : {}),
    ...(onTextReplace ? { onTextReplace } : {}),
    ...(onTextInsertBefore ? { onTextInsertBefore } : {}),
    ...(onTextInsertAfter ? { onTextInsertAfter } : {}),
    ...(callbacks?.originalText !== undefined
      ? { originalText: callbacks.originalText }
      : {}),
  };

  return managed;
}

// =============================================================================
// Warnings for not-yet-supported invocation fields
// =============================================================================

function warnUnsupported(invocation: ConversationInvocation): void {
  if (process.env.NODE_ENV === "production") return;

  if (invocation.identity.conversationId) {
    // eslint-disable-next-line no-console
    console.warn(
      "[launchConversation] identity.conversationId is passed through to the " +
        "execution thunk, but turn-2+ routing currently still goes through " +
        "executeInstance's existing `selectHasConversationHistory` branch. " +
        "The explicit conversationId-in-invocation path lands in Phase 3.",
    );
  }

  // Ephemeral routing is wired end-to-end. The invocation's `isEphemeral`
  // flag is stamped on the ConversationRecord via `createInstance` and the
  // execute thunks (`execute-instance`, `execute-chat-instance`) branch on
  // `instance.isEphemeral`:
  //   Turn 1:  POST /ai/agents/{id} with `is_new:false, store:false`.
  //   Turn 2+: delegates to executeChatInstance → POST /ai/manual with full
  //            accumulated history (`store:false`, `is_new:false`).
  // No warning needed here — the flag is honored. See
  // `features/agents/types/conversation-invocation.types.ts` for the
  // endpoint routing table.

  if (
    invocation.relation?.parentConversationId ||
    invocation.relation?.forkedFromId
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      "[launchConversation] relation.* fields (parentConversationId, " +
        "forkedFromId) are accepted but not yet stamped onto the server-side " +
        "conversation record via this thunk. Set them via the conversations " +
        "slice patchConversation action or wait for the loadConversation bundle.",
    );
  }
}

// =============================================================================
// The thunk
// =============================================================================

interface ThunkApi {
  dispatch: AppDispatch;
  state: RootState;
}

/**
 * Launch a new or continuing conversation from a `ConversationInvocation`.
 *
 * Behavior:
 *   - identity.conversationId absent → new conversation, turn 1.
 *   - identity.conversationId present → continuing conversation, turn 2+.
 *   - origin.isEphemeral → (future) stateless routing; see warnUnsupported.
 *   - routing.apiEndpointMode === "manual" → Builder/prompts endpoint.
 *
 * Returns the `LaunchResult` from `launchAgentExecution`:
 *   - conversationId (authoritative id, mirrored server-side)
 *   - requestId (for live stream tracking)
 *   - responseText (resolved after stream completes)
 */
export const launchConversation = createAsyncThunk<
  LaunchResult,
  ConversationInvocation,
  ThunkApi
>("conversations/launch", async (invocation, { dispatch }) => {
  warnUnsupported(invocation);
  const managed = invocationToManagedOptions(invocation);
  const result = await dispatch(launchAgentExecution(managed)).unwrap();
  return result;
});

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { ConversationInvocation, ApiEndpointMode };
export type { LaunchResult };
