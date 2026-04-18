/**
 * launchConversation — unified entry point for every invocation path.
 *
 * Accepts a `ConversationInvocation` (the locked Phase 0 contract) and drives
 * the existing execution machinery. Every surface — Chat, Runner, Shortcut,
 * App, Builder — funnels through this thunk. There is no other way to start
 * an agent conversation from the client.
 *
 * During the migration, this thunk:
 *   1. Registers CallbackManager functions referenced by
 *      `callbacks.groupId` (the invocation itself is serializable; function
 *      refs live in CallbackManager).
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
import type {
  ConversationInvocation,
  ConversationMode,
} from "@/features/agents/types/conversation-invocation.types";
import type { ManagedAgentOptions } from "@/features/agents/types/instance.types";
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
  // through unchanged — the widened ManagedAgentOptions.conversationMode
  // type accepts it directly. Emit "agent" or "manual" only; "chat" is no
  // longer produced by new code paths.
  const forwardedConversationMode: "agent" | "manual" =
    routing.conversationMode === "manual" ? "manual" : "agent";

  // Resolve function refs from the callback group (they live outside Redux).
  const onComplete =
    callbacks?.groupId != null
      ? callbackManager.findByContext<
          (result: LaunchResult) => void
        >(callbacks.groupId, { type: "complete" })
      : undefined;
  const onTextReplace =
    callbacks?.groupId != null
      ? callbackManager.findByContext<(text: string) => void>(
          callbacks.groupId,
          { type: "replace" },
        )
      : undefined;
  const onTextInsertBefore =
    callbacks?.groupId != null
      ? callbackManager.findByContext<(text: string) => void>(
          callbacks.groupId,
          { type: "insertBefore" },
        )
      : undefined;
  const onTextInsertAfter =
    callbacks?.groupId != null
      ? callbackManager.findByContext<(text: string) => void>(
          callbacks.groupId,
          { type: "insertAfter" },
        )
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
    conversationMode: forwardedConversationMode,

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

  if (invocation.origin.isEphemeral) {
    // eslint-disable-next-line no-console
    console.warn(
      "[launchConversation] origin.isEphemeral=true is accepted by the " +
        "invocation contract but not yet routed to the stateless endpoints. " +
        "For now the call runs through the standard persistent path.",
    );
    // TODO(isEphemeral): route stateless turns.
    //   Turn 1:  POST /ai/agents/{id} with `is_new:false, store:false`, no
    //            `conversationId`. Server streams, writes nothing to the DB.
    //   Turn 2+: POST /ai/chat (NOT /conversations/{id} — that 404s because
    //            no DB row exists). Client serializes the full accumulated
    //            history from the `messages/` slice on every turn and sends
    //            it alongside `is_new:false, store:false`. Redux is the sole
    //            source of truth for ephemeral conversations.
    //   See `features/agents/types/conversation-invocation.types.ts` for
    //   the locked contract and the endpoint routing table.
  }

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
 *   - routing.conversationMode === "manual" → Builder/prompts endpoint.
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

export type { ConversationInvocation, ConversationMode };
export type { LaunchResult };
