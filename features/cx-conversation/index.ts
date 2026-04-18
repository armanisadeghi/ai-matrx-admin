/**
 * Unified Conversation UI — Public API
 *
 * Import the wrapper and hook from here. Internal components
 * (ConversationShell, MessageList, AssistantMessage, etc.) are
 * implementation details — import them directly from their files
 * only if you genuinely need them outside this feature.
 *
 * Usage:
 *   import { UnifiedChatWrapper } from '@/features/cx-conversation';
 *   import { useConversationSession } from '@/features/cx-conversation';
 */

// ── Top-level wrapper ────────────────────────────────────────────────────────
export { UnifiedChatWrapper } from "./UnifiedChatWrapper";
export type { UnifiedChatWrapperProps } from "./UnifiedChatWrapper";

// ── Hooks ────────────────────────────────────────────────────────────────────
export { useConversationSession } from "./hooks/useConversationSession";
export type {
  ConversationSessionConfig,
  ConversationSessionReturn,
} from "./hooks/useConversationSession";

// ── Types only (no component imports) ────────────────────────────────────────
export type { ConversationShellProps } from "./ConversationShell";
export type { ConversationInputProps } from "./ConversationInput";
export type { AssistantMessageProps } from "./AssistantMessage";
export type { MessageOptionsMenuProps } from "./MessageOptionsMenu";

// ── Message actions (Redux-driven overlays) ─────────────────────────────────
export {
  messageActionsActions,
  messageActionsReducer,
  selectMessageActionInstance,
} from "./OLD-cx-message-actions/messageActionsSlice";
export type {
  MessageActionInstance,
  MessageActionsState,
} from "./OLD-cx-message-actions/messageActionsSlice";
export {
  getMessageActions,
  resumePendingAuthAction,
} from "./actions/messageActionRegistry";
export type { MessageActionContext } from "./actions/messageActionRegistry";
