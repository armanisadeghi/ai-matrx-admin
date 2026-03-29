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

// ── Hooks ────────────────────────────────────────────────────────────────────
export { useConversationSession } from "../../hooks/useConversationSession";
export type {
  ConversationSessionConfig,
  ConversationSessionReturn,
} from "../../hooks/useConversationSession";

// ── Types only (no component imports) ────────────────────────────────────────
export type { ConversationShellProps } from "../core/ConversationShell";
export type { ConversationInputProps } from "../user-input/ConversationInput";
export type { AssistantMessageProps } from "../messages/AssistantMessage";
export type { MessageOptionsMenuProps } from "../messages/MessageOptionsMenu";

export {
  getMessageActions,
  resumePendingAuthAction,
} from "../../actions/messageActionRegistry";
export type { MessageActionContext } from "../../actions/messageActionRegistry";
