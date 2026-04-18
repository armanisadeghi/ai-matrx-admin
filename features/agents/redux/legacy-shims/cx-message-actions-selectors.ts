/**
 * Legacy selectors shim for chat-feature imports.
 *
 * Replaces `@/features/agents/redux/old/OLD-cx-message-actions/selectors`.
 * chat is being rebuilt on the new slices (`conversations`, `messages`,
 * `conversation-list`, `observability`). Every selector here returns the
 * zero-value expected by the old shape — callers render empty UI until the
 * chat surface is reimplemented.
 */

import type { RootState } from "@/lib/redux/store";

// ── Stable zero-value exports (referenced with `as`-imported identities) ─────

export const EMPTY_MESSAGES: unknown[] = [];
export const EMPTY_RESOURCES: unknown[] = [];
export const EMPTY_TOOL_CALLS_BY_ID: Record<string, unknown> = {};
export const EMPTY_RAW_TOOL_CALLS: unknown[] = [];
export const EMPTY_VARIABLE_DEFAULTS: unknown[] = [];

// ── Session / conversation identity ──────────────────────────────────────────

export const selectSession = (_state: RootState, _sessionId: string) =>
  undefined;
export const selectSessionStatus = (
  _state: RootState,
  _sessionId: string,
): string => "idle";
export const selectSessionError = (
  _state: RootState,
  _sessionId: string,
): string | null => null;
export const selectConversationId = (
  _state: RootState,
  _sessionId: string,
): string | null => null;
export const selectAgentId = (
  _state: RootState,
  _sessionId: string,
): string | null => null;
export const selectRequiresVariableReplacement = (
  _state: RootState,
  _sessionId: string,
): boolean => false;
export const selectApiMode = (_state: RootState, _sessionId: string): string =>
  "agent";
export const selectChatModeConfig = (_state: RootState, _sessionId: string) =>
  undefined;

// ── Messages ─────────────────────────────────────────────────────────────────

export const selectMessages = (_state: RootState, _sessionId: string) =>
  EMPTY_MESSAGES;
export const selectLastAssistantMessageId = (
  _state: RootState,
  _sessionId: string,
): string | null => null;
export const selectGroupedMessages = (_state: RootState, _sessionId: string) =>
  EMPTY_MESSAGES;

// ── Execution flags ──────────────────────────────────────────────────────────

export const selectIsStreaming = (
  _state: RootState,
  _sessionId: string,
): boolean => false;
export const selectIsExecuting = (
  _state: RootState,
  _sessionId: string,
): boolean => false;

// ── Input / resources / variables ────────────────────────────────────────────

export const selectCurrentInput = (
  _state: RootState,
  _sessionId: string,
): string => "";
export const selectResources = (_state: RootState, _sessionId: string) =>
  EMPTY_RESOURCES;
export const selectVariableDefaults = (_state: RootState, _sessionId: string) =>
  EMPTY_VARIABLE_DEFAULTS;
export const selectHasVariables = (
  _state: RootState,
  _sessionId: string,
): boolean => false;
export const selectVariableValues = (_state: RootState, _sessionId: string) =>
  ({}) as Record<string, unknown>;

// ── UI state ─────────────────────────────────────────────────────────────────

export const selectUIState = (_state: RootState, _sessionId: string) =>
  undefined;
export const selectExpandedVariable = (
  _state: RootState,
  _sessionId: string,
): string | null => null;
export const selectShowVariables = (
  _state: RootState,
  _sessionId: string,
): boolean => false;
export const selectShowSystemMessages = (
  _state: RootState,
  _sessionId: string,
): boolean => false;
export const selectModelOverride = (
  _state: RootState,
  _sessionId: string,
): string | null => null;
export const selectUseLocalhost = (
  _state: RootState,
  _sessionId: string,
): boolean => false;
export const selectIsBlockMode = (
  _state: RootState,
  _sessionId: string,
): boolean => false;
export const selectShowDebugInfo = (
  _state: RootState,
  _sessionId: string,
): boolean => false;

// ── Effective model selectors ────────────────────────────────────────────────

export const selectEffectiveModelId = (
  _state: RootState,
  _sessionId: string,
): string | null => null;
export const selectEffectiveModelLabel = (
  _state: RootState,
  _sessionId: string,
): string | null => null;
export const selectSessionPromptSettings = (
  _state: RootState,
  _sessionId: string,
) => ({}) as Record<string, unknown>;
export const selectEffectiveSettings = (
  _state: RootState,
  _sessionId: string,
) => ({}) as Record<string, unknown>;

// ── Tool calls ───────────────────────────────────────────────────────────────

export const selectToolCallsById = (_state: RootState, _sessionId: string) =>
  EMPTY_TOOL_CALLS_BY_ID;
export const selectToolCallByCallId = (
  _state: RootState,
  _sessionId: string,
  _callId: string,
) => undefined;
export const selectMessageRawToolCalls = (
  _state: RootState,
  _sessionId: string,
  _messageId: string,
) => EMPTY_RAW_TOOL_CALLS;
export const selectAllToolCalls = (_state: RootState, _sessionId: string) =>
  EMPTY_TOOL_CALLS_BY_ID;

// ── Protocol / DB snapshots ──────────────────────────────────────────────────

export const selectProtocolDbMessages = (
  _state: RootState,
  _sessionId: string,
) => EMPTY_MESSAGES;
export const selectProtocolDbToolCalls = (
  _state: RootState,
  _sessionId: string,
) => EMPTY_MESSAGES;
export const selectHasProtocolDbSnapshot = (
  _state: RootState,
  _sessionId: string,
): boolean => false;
export const selectProtocolCanonicalMessages = (
  _state: RootState,
  _sessionId: string,
) => EMPTY_MESSAGES;

// ── Content history / unsaved change markers ─────────────────────────────────

export const selectMessageContentHistory = (
  _state: RootState,
  _sessionId: string,
  _messageId: string,
) => [];
export const selectMessageHasHistory = (
  _state: RootState,
  _sessionId: string,
  _messageId: string,
): boolean => false;
export const selectMessageHasUnsavedChanges = (
  _state: RootState,
  _sessionId: string,
  _messageId: string,
): boolean => false;
export const selectSessionHasUnsavedChanges = (
  _state: RootState,
  _sessionId: string,
): boolean => false;
export const selectDirtyMessages = (
  _state: RootState,
  _sessionId: string,
): unknown[] => [];
