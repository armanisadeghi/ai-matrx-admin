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
export { UnifiedChatWrapper } from '@/components/conversation/UnifiedChatWrapper';
export type { UnifiedChatWrapperProps } from '@/components/conversation/UnifiedChatWrapper';

// ── Shell & Layout ───────────────────────────────────────────────────────────
export { ConversationShell } from '@/components/conversation/ConversationShell';
export type { ConversationShellProps } from '@/components/conversation/ConversationShell';

// ── Input ────────────────────────────────────────────────────────────────────
export { ConversationInput } from '@/components/conversation/ConversationInput';
export type { ConversationInputProps } from '@/components/conversation/ConversationInput';

// ── Messages ─────────────────────────────────────────────────────────────────
export { MessageList } from '@/components/conversation/MessageList';
export { AssistantMessage } from '@/components/conversation/AssistantMessage';
export type { AssistantMessageProps } from '@/components/conversation/AssistantMessage';
export { UserMessage } from '@/components/conversation/UserMessage';
export { MessageErrorBoundary } from '@/components/conversation/MessageErrorBoundary';
export { StreamingContentBlocks } from '@/components/conversation/StreamingContentBlocks';

// ── Tool visualization ───────────────────────────────────────────────────────
export { default as ToolCallVisualization } from '@/components/conversation/ToolCallVisualization';

// ── Menus ────────────────────────────────────────────────────────────────────
export { default as MessageOptionsMenu } from '@/components/conversation/MessageOptionsMenu';
export type { MessageOptionsMenuProps } from '@/components/conversation/MessageOptionsMenu';
