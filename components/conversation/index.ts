/**
 * Unified Conversation UI Components
 *
 * All conversation-related components are here. Import from this barrel
 * instead of individual files to get all components in one import.
 *
 * Usage:
 *   // Full wrapper (recommended entry point for new routes):
 *   import { UnifiedChatWrapper } from '@/components/conversation';
 *
 *   // Hook-only (when you need custom layout):
 *   import { useConversationSession } from '@/components/conversation';
 *
 *   // Individual components:
 *   import { ConversationShell, MessageList, AssistantMessage } from '@/components/conversation';
 */

// ── Top-level wrapper ────────────────────────────────────────────────────────
export { UnifiedChatWrapper } from './UnifiedChatWrapper';
export type { UnifiedChatWrapperProps } from './UnifiedChatWrapper';

// ── Hooks ────────────────────────────────────────────────────────────────────
export { useConversationSession } from './hooks/useConversationSession';
export type { ConversationSessionConfig, ConversationSessionReturn } from './hooks/useConversationSession';

// ── Shell & Layout ───────────────────────────────────────────────────────────
export { ConversationShell } from './ConversationShell';
export type { ConversationShellProps } from './ConversationShell';

// ── Input ────────────────────────────────────────────────────────────────────
export { ConversationInput } from './ConversationInput';
export type { ConversationInputProps } from './ConversationInput';

// ── Messages ─────────────────────────────────────────────────────────────────
export { MessageList } from './MessageList';
export { AssistantMessage } from './AssistantMessage';
export type { AssistantMessageProps } from './AssistantMessage';
export { UserMessage } from './UserMessage';
export { MessageErrorBoundary } from './MessageErrorBoundary';
export { StreamingContentBlocks } from './StreamingContentBlocks';

// ── Tool visualization ───────────────────────────────────────────────────────
export { default as ToolCallVisualization } from './ToolCallVisualization';

// ── Menus ────────────────────────────────────────────────────────────────────
export { default as MessageOptionsMenu } from './MessageOptionsMenu';
export type { MessageOptionsMenuProps } from './MessageOptionsMenu';
