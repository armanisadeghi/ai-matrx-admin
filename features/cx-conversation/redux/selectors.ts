import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../../lib/redux/store";
import {
  EMPTY_MESSAGES,
  EMPTY_RESOURCES,
  EMPTY_VARIABLE_DEFAULTS,
  DEFAULT_UI_STATE,
  EMPTY_TOOL_CALLS_BY_ID,
  EMPTY_RAW_TOOL_CALLS,
} from "./slice";
import type { ConversationSession, SessionUIState } from "./types";

// Stable empty references — never use inline `?? {}` inside input selectors,
// as that creates a new reference on every call and breaks createSelector memoization.
const EMPTY_MODEL_SETTINGS: Record<string, unknown> = {};
import type {
  CxToolCall,
  CxContentHistoryEntry,
} from "@/features/public-chat/types/cx-tables";

const EMPTY_CONTENT_HISTORY: CxContentHistoryEntry[] = [];

// ============================================================================
// BASE SELECTORS
// ============================================================================

const selectChatConversations = (state: RootState) => state.chatConversations;

// ============================================================================
// SESSION SELECTORS
// ============================================================================

export const selectSession = (
  state: RootState,
  sessionId: string,
): ConversationSession | undefined =>
  state.chatConversations.sessions[sessionId];

export const selectSessionStatus = (state: RootState, sessionId: string) =>
  state.chatConversations.sessions[sessionId]?.status ?? "idle";

export const selectSessionError = (state: RootState, sessionId: string) =>
  state.chatConversations.sessions[sessionId]?.error ?? null;

export const selectConversationId = (state: RootState, sessionId: string) =>
  state.chatConversations.sessions[sessionId]?.conversationId ?? null;

export const selectAgentId = (state: RootState, sessionId: string) =>
  state.chatConversations.sessions[sessionId]?.agentId ?? "";

export const selectRequiresVariableReplacement = (
  state: RootState,
  sessionId: string,
) =>
  state.chatConversations.sessions[sessionId]?.requiresVariableReplacement ??
  false;

export const selectApiMode = (state: RootState, sessionId: string) =>
  state.chatConversations.sessions[sessionId]?.apiMode ?? "agent";

export const selectChatModeConfig = (state: RootState, sessionId: string) =>
  state.chatConversations.sessions[sessionId]?.chatModeConfig ?? null;

// ============================================================================
// MESSAGE SELECTORS
// ============================================================================

export const selectMessages = (state: RootState, sessionId: string) =>
  state.chatConversations.sessions[sessionId]?.messages ?? EMPTY_MESSAGES;

export const selectLastAssistantMessageId = (
  state: RootState,
  sessionId: string,
): string | null => {
  const messages = state.chatConversations.sessions[sessionId]?.messages;
  if (!messages) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i].id;
  }
  return null;
};

// ============================================================================
// GROUPED MESSAGES — merge consecutive assistant messages into one turn
// ============================================================================
//
// The database stores each "cycle" of an assistant's multi-step response as a
// separate cx_message row. For example, when the assistant does:
//   thinking → tool call → text → tool call → text
// the backend might store 3+ separate assistant rows.
//
// The streaming path naturally produces a single assistant message per user
// message, so this merge is only needed for DB-loaded conversations. However,
// applying it unconditionally is safe — if there's only one assistant message
// in a run, merging is a no-op.
//
// The merge combines content (joined by double newlines), toolUpdates,
// rawToolCalls, and streamEvents. The first message in the group is used as the
// "primary" — its id, timestamp, and DB metadata are preserved.

import type { ConversationMessage } from "./types";

function mergeConsecutiveAssistantMessages(
  messages: ConversationMessage[],
): ConversationMessage[] {
  if (messages.length <= 1) return messages;

  const result: ConversationMessage[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    // Non-assistant messages pass through unchanged
    if (msg.role !== "assistant") {
      result.push(msg);
      i++;
      continue;
    }

    // Start of an assistant run — collect all consecutive assistant messages
    const group: ConversationMessage[] = [msg];
    let j = i + 1;
    while (j < messages.length && messages[j].role === "assistant") {
      group.push(messages[j]);
      j++;
    }

    if (group.length === 1) {
      // Single assistant message — no merge needed
      result.push(msg);
    } else {
      // Merge the group into a single message
      // Use the first message as the base (preserves its id, timestamps, etc.)
      const primary = group[0];

      // Combine content — filter out empty strings to avoid ugly double newlines
      const contentParts = group
        .map((m) => m.content)
        .filter((c) => c.length > 0);
      const mergedContent = contentParts.join("\n\n");

      // Combine tool updates
      const mergedToolUpdates = group.flatMap(
        (m) => (m.toolUpdates as unknown[] | undefined) ?? [],
      );

      // Combine raw tool calls
      const mergedRawToolCalls = group.flatMap(
        (m) => (m.rawToolCalls as CxToolCall[] | undefined) ?? [],
      );

      // Combine stream events
      const mergedStreamEvents = group.flatMap((m) => m.streamEvents ?? []);

      // Combine raw content blocks
      const mergedRawContent = group.flatMap(
        (m) => (m.rawContent as unknown[] | undefined) ?? [],
      );

      // Use the "worst" status: if any message errored, the group errors.
      // If any is streaming, the group is streaming. Otherwise complete.
      let mergedStatus = primary.status;
      for (const m of group) {
        if (m.status === "error") {
          mergedStatus = "error";
          break;
        }
        if (m.status === "streaming") mergedStatus = "streaming";
        if (m.status === "pending" && mergedStatus === "complete")
          mergedStatus = "pending";
      }

      // isCondensed: only if ALL messages in the group are condensed
      const allCondensed = group.every((m) => m.isCondensed);

      // Build merged IDs list for reference (stored in metadata)
      const mergedIds = group.map((m) => m.id);

      const merged: ConversationMessage = {
        ...primary,
        content: mergedContent,
        status: mergedStatus,
        toolUpdates:
          mergedToolUpdates.length > 0 ? mergedToolUpdates : undefined,
        rawToolCalls:
          mergedRawToolCalls.length > 0 ? mergedRawToolCalls : undefined,
        streamEvents:
          mergedStreamEvents.length > 0 ? mergedStreamEvents : undefined,
        rawContent: mergedRawContent.length > 0 ? mergedRawContent : undefined,
        isCondensed: allCondensed || undefined,
        // Store the original display content from the merged result for edit/reset
        originalDisplayContent:
          contentParts.join("\n\n") || primary.originalDisplayContent,
        // Preserve merged source IDs in metadata for debugging/edit operations
        metadata: {
          ...primary.metadata,
          mergedFromIds: mergedIds,
        },
      };

      result.push(merged);
    }

    i = j;
  }

  return result;
}

/**
 * Memoized selector that returns messages with consecutive assistant messages
 * merged into single turns. The UI should use this instead of selectMessages
 * for rendering the message list.
 *
 * Raw selectMessages is still available for operations that need per-DB-row
 * access (e.g. edit/save operations).
 */
export const selectGroupedMessages = createSelector(
  [
    (state: RootState, sessionId: string) =>
      state.chatConversations.sessions[sessionId]?.messages ?? EMPTY_MESSAGES,
  ],
  (messages): ConversationMessage[] =>
    mergeConsecutiveAssistantMessages(messages),
);

export const selectIsStreaming = (
  state: RootState,
  sessionId: string,
): boolean => {
  const session = state.chatConversations.sessions[sessionId];
  return session?.status === "streaming" || session?.status === "executing";
};

export const selectIsExecuting = (
  state: RootState,
  sessionId: string,
): boolean => {
  const session = state.chatConversations.sessions[sessionId];
  return session?.status === "executing" || session?.status === "streaming";
};

// ============================================================================
// INPUT SELECTORS (high-frequency — read from isolated map)
// ============================================================================

export const selectCurrentInput = (
  state: RootState,
  sessionId: string,
): string => state.chatConversations.currentInputs[sessionId] ?? "";

// ============================================================================
// RESOURCE SELECTORS (high-frequency — read from isolated map)
// ============================================================================

export const selectResources = (state: RootState, sessionId: string) =>
  state.chatConversations.resources[sessionId] ?? EMPTY_RESOURCES;

// ============================================================================
// VARIABLE SELECTORS
// ============================================================================

export const selectVariableDefaults = (state: RootState, sessionId: string) =>
  state.chatConversations.sessions[sessionId]?.variableDefaults ??
  EMPTY_VARIABLE_DEFAULTS;

export const selectHasVariables = (
  state: RootState,
  sessionId: string,
): boolean =>
  (state.chatConversations.sessions[sessionId]?.variableDefaults?.length ?? 0) >
  0;

/**
 * Memoized flat map of variable name → current value (defaultValue).
 * Used by variable input components to read their current values without
 * prop drilling from ConversationInput.
 */
export const selectVariableValues = createSelector(
  (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.variableDefaults ??
    EMPTY_VARIABLE_DEFAULTS,
  (variableDefaults): Record<string, string> =>
    Object.fromEntries(
      variableDefaults.map((v) => [v.name, String(v.defaultValue ?? "")]),
    ),
);

// ============================================================================
// UI STATE SELECTORS (high-frequency — read from isolated map)
// ============================================================================

export const selectUIState = (
  state: RootState,
  sessionId: string,
): SessionUIState =>
  state.chatConversations.uiState[sessionId] ?? DEFAULT_UI_STATE;

export const selectExpandedVariable = (state: RootState, sessionId: string) =>
  state.chatConversations.uiState[sessionId]?.expandedVariable ?? null;

export const selectShowVariables = (state: RootState, sessionId: string) =>
  state.chatConversations.uiState[sessionId]?.showVariables ?? false;

export const selectShowSystemMessages = (state: RootState, sessionId: string) =>
  state.chatConversations.uiState[sessionId]?.showSystemMessages ?? false;

export const selectModelOverride = (state: RootState, sessionId: string) =>
  state.chatConversations.uiState[sessionId]?.modelOverride ?? null;

export const selectUseLocalhost = (state: RootState, sessionId: string) =>
  state.chatConversations.uiState[sessionId]?.useLocalhost ?? false;

export const selectUseBlockMode = (state: RootState, sessionId: string) =>
  state.chatConversations.uiState[sessionId]?.useBlockMode ?? false;

export const selectShowDebugInfo = (state: RootState, sessionId: string) =>
  state.chatConversations.uiState[sessionId]?.showDebugInfo ?? false;

/**
 * Resolves the effective model ID for a session:
 *   1. Session-level override (user explicitly picked a different model)
 *   2. Agent default model (loaded from settings.model_id in useAgentBootstrap)
 *
 * Never falls back to a hardcoded value — returns null if neither is set.
 */
export const selectEffectiveModelId = createSelector(
  [
    (state: RootState, sessionId: string) =>
      state.chatConversations.uiState[sessionId]?.modelOverride ?? null,
    (state: RootState) => state.activeChat.modelOverride,
  ],
  (sessionOverride, agentDefaultModelId): string | null =>
    sessionOverride ?? agentDefaultModelId,
);

/**
 * Resolves the display label for the effective model (common_name → name → id).
 * Uses selectEffectiveModelId so it always reflects the correct model —
 * whether that's a user override or the agent's default.
 */
export const selectEffectiveModelLabel = createSelector(
  [
    (state: RootState, sessionId: string) =>
      state.chatConversations.uiState[sessionId]?.modelOverride ?? null,
    (state: RootState) => state.activeChat.modelOverride,
    (state: RootState) => state.modelRegistry.availableModels,
  ],
  (sessionOverride, agentDefaultModelId, availableModels): string | null => {
    const modelId = sessionOverride ?? agentDefaultModelId;
    if (!modelId) return null;
    const model = availableModels.find((m) => m.id === modelId);
    if (!model) return null;
    return model.common_name || model.name || model.id;
  },
);

/**
 * Memoized PromptSettings shape for ModelSettingsDialog.
 * Only contains session-level user overrides. Use selectEffectiveSettings
 * when you need the full merged view for display purposes.
 */
export const selectSessionPromptSettings = createSelector(
  [
    (state: RootState, sessionId: string) =>
      state.chatConversations.uiState[sessionId]?.modelOverride ?? null,
    (state: RootState, sessionId: string) =>
      (state.chatConversations.uiState[sessionId]?.modelSettings ??
        EMPTY_MODEL_SETTINGS) as Record<string, unknown>,
  ],
  (
    modelOverride,
    modelSettings,
  ): import("@/features/prompts/types/core").PromptSettings => ({
    ...(modelOverride ? { model_id: modelOverride } : {}),
    ...modelSettings,
  }),
);

/**
 * Resolves the full effective settings to display in ModelSettingsDialog.
 * Merges key-by-key: agent defaults as the base, session-level user overrides on top.
 * model_id is the resolved effective model (session override → agent default).
 *
 * This is what the dialog shows — the real current state, not just the delta.
 */
export const selectEffectiveSettings = createSelector(
  [
    (state: RootState) => state.activeChat.agentDefaultSettings,
    (state: RootState, sessionId: string) =>
      (state.chatConversations.uiState[sessionId]?.modelSettings ??
        EMPTY_MODEL_SETTINGS) as Record<string, unknown>,
    (state: RootState, sessionId: string) =>
      state.chatConversations.uiState[sessionId]?.modelOverride ?? null,
    (state: RootState) => state.activeChat.modelOverride,
  ],
  (
    agentDefaults,
    sessionOverrides,
    sessionModelOverride,
    agentModelId,
  ): import("@/features/prompts/types/core").PromptSettings => {
    const effectiveModelId = sessionModelOverride ?? agentModelId ?? undefined;
    return {
      ...agentDefaults,
      ...sessionOverrides,
      ...(effectiveModelId ? { model_id: effectiveModelId } : {}),
    };
  },
);

// ============================================================================
// TOOL CALL SELECTORS
// ============================================================================

/**
 * All CxToolCall records for this session, keyed by call_id.
 * Returns stable EMPTY_TOOL_CALLS_BY_ID when session has no tool calls.
 */
export const selectToolCallsById = (
  state: RootState,
  sessionId: string,
): Record<string, CxToolCall> =>
  state.chatConversations.sessions[sessionId]?.toolCallsById ??
  EMPTY_TOOL_CALLS_BY_ID;

/**
 * Look up a single CxToolCall by its call_id (the provider-assigned tool call ID).
 * Returns undefined if not found.
 */
export const selectToolCallByCallId = (
  state: RootState,
  sessionId: string,
  callId: string,
): CxToolCall | undefined =>
  state.chatConversations.sessions[sessionId]?.toolCallsById?.[callId];

/**
 * All CxToolCall records for a specific message (i.e. the tool calls it invoked).
 * Returns stable EMPTY_RAW_TOOL_CALLS when the message has no rawToolCalls.
 */
export const selectMessageRawToolCalls = (
  state: RootState,
  sessionId: string,
  messageId: string,
): CxToolCall[] => {
  const message = state.chatConversations.sessions[sessionId]?.messages.find(
    (m) => m.id === messageId,
  );
  return (
    (message?.rawToolCalls as CxToolCall[] | undefined) ?? EMPTY_RAW_TOOL_CALLS
  );
};

/**
 * All tool call records for a session as a flat array (for iteration/display).
 */
export const selectAllToolCalls = createSelector(
  (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.toolCallsById ??
    EMPTY_TOOL_CALLS_BY_ID,
  (byId): CxToolCall[] => Object.values(byId),
);

// ============================================================================
// CONTENT HISTORY SELECTORS
// ============================================================================

/** Content history snapshots for a specific message. Empty array if none. */
export const selectMessageContentHistory = (
  state: RootState,
  sessionId: string,
  messageId: string,
): CxContentHistoryEntry[] => {
  const msg = state.chatConversations.sessions[sessionId]?.messages.find(
    (m) => m.id === messageId,
  );
  return (
    (msg?.contentHistory as CxContentHistoryEntry[] | null | undefined) ??
    EMPTY_CONTENT_HISTORY
  );
};

/** Whether a message has any content history (i.e. has been edited at least once). */
export const selectMessageHasHistory = (
  state: RootState,
  sessionId: string,
  messageId: string,
): boolean => {
  const msg = state.chatConversations.sessions[sessionId]?.messages.find(
    (m) => m.id === messageId,
  );
  const history = msg?.contentHistory as
    | CxContentHistoryEntry[]
    | null
    | undefined;
  return Array.isArray(history) && history.length > 0;
};

/** Number of history snapshots for a message (= number of times it has been edited). */
export const selectMessageHistoryCount = (
  state: RootState,
  sessionId: string,
  messageId: string,
): number => {
  const msg = state.chatConversations.sessions[sessionId]?.messages.find(
    (m) => m.id === messageId,
  );
  const history = msg?.contentHistory as
    | CxContentHistoryEntry[]
    | null
    | undefined;
  return Array.isArray(history) ? history.length : 0;
};

// ============================================================================
// UNSAVED CHANGES SELECTORS
// ============================================================================

/** Whether a specific message has locally edited content that differs from the snapshot. */
export const selectMessageHasUnsavedChanges = (
  state: RootState,
  sessionId: string,
  messageId: string,
): boolean => {
  const msg = state.chatConversations.sessions[sessionId]?.messages.find(
    (m) => m.id === messageId,
  );
  if (!msg || msg.originalDisplayContent === undefined) return false;
  return msg.content !== msg.originalDisplayContent;
};

/** Whether ANY message in the session has unsaved local edits. */
export const selectSessionHasUnsavedChanges = (
  state: RootState,
  sessionId: string,
): boolean => {
  const messages = state.chatConversations.sessions[sessionId]?.messages;
  if (!messages) return false;
  return messages.some(
    (msg) =>
      msg.originalDisplayContent !== undefined &&
      msg.content !== msg.originalDisplayContent,
  );
};

/** All messages in a session that have locally edited content differing from the snapshot. Memoized. */
export const selectDirtyMessages = createSelector(
  [
    (state: RootState, sessionId: string) =>
      state.chatConversations.sessions[sessionId]?.messages ?? EMPTY_MESSAGES,
  ],
  (messages): ConversationMessage[] =>
    messages.filter(
      (m) =>
        m.originalDisplayContent !== undefined &&
        m.content !== m.originalDisplayContent,
    ),
);

/** The original display content snapshot for a message (for reset). */
export const selectMessageOriginalContent = (
  state: RootState,
  sessionId: string,
  messageId: string,
): string | undefined => {
  const msg = state.chatConversations.sessions[sessionId]?.messages.find(
    (m) => m.id === messageId,
  );
  return msg?.originalDisplayContent;
};
