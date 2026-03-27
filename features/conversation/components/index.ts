/**
 * features/conversation/components — Component re-exports.
 *
 * The actual component files live in components/conversation/ (the shared
 * component directory). This barrel provides a consistent import path:
 *
 *   import { UnifiedChatWrapper, MessageList } from '@/features/conversation/components';
 *
 * Heavy components are also available as lazy-loadable via the /lazy sub-path.
 */

// ── Top-level wrapper ────────────────────────────────────────────────────────
export { UnifiedChatWrapper } from '@/features/cx-conversation/UnifiedChatWrapper';
export type { UnifiedChatWrapperProps } from '@/features/cx-conversation/UnifiedChatWrapper';

// ── Shell & Layout ───────────────────────────────────────────────────────────
export { ConversationShell } from '@/features/cx-conversation/ConversationShell';
export type { ConversationShellProps } from '@/features/cx-conversation/ConversationShell';

// ── Input ────────────────────────────────────────────────────────────────────
export { ConversationInput } from '@/features/cx-conversation/ConversationInput';
export type { ConversationInputProps } from '@/features/cx-conversation/ConversationInput';

// ── Messages ─────────────────────────────────────────────────────────────────
export { MessageList } from '@/features/cx-conversation/MessageList';
export { AssistantMessage } from '@/features/cx-conversation/AssistantMessage';
export type { AssistantMessageProps } from '@/features/cx-conversation/AssistantMessage';
export { UserMessage } from '@/features/cx-conversation/UserMessage';
export { MessageErrorBoundary } from '@/features/cx-conversation/MessageErrorBoundary';
// ── Tool visualization ───────────────────────────────────────────────────────
export { default as ToolCallVisualization } from '@/features/cx-conversation/ToolCallVisualization';

// ── Menus ────────────────────────────────────────────────────────────────────
export { default as MessageOptionsMenu } from '@/features/cx-conversation/MessageOptionsMenu';
export type { MessageOptionsMenuProps } from '@/features/cx-conversation/MessageOptionsMenu';
