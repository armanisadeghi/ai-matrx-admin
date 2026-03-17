/**
 * features/conversation — Unified Conversation Feature
 *
 * Single entry point for all conversation/chat functionality.
 * Encompasses UI components, hooks, state management, utilities, and types.
 *
 * ─── QUICK START ──────────────────────────────────────────────────────────────
 *
 *   // Drop-in chat wrapper (most common):
 *   import { UnifiedChatWrapper } from '@/features/conversation';
 *   <UnifiedChatWrapper agentId="prompt-uuid" />
 *
 *   // Public route integration:
 *   import { usePublicChatProps, UnifiedChatWrapper } from '@/features/conversation';
 *   const props = usePublicChatProps({ agentId, conversationId });
 *   <UnifiedChatWrapper {...props} />
 *
 *   // Authenticated route integration:
 *   import { useAuthenticatedChatProps, UnifiedChatWrapper } from '@/features/conversation';
 *   const props = useAuthenticatedChatProps({ agentId, showModelPicker: true });
 *   <UnifiedChatWrapper {...props} />
 *
 *   // Hook-only (custom layout):
 *   import { useConversationSession } from '@/features/conversation';
 *
 *   // Lazy-loaded for route splitting:
 *   import { LazyUnifiedChatWrapper } from '@/features/conversation/components/lazy';
 *
 * ─── ARCHITECTURE ─────────────────────────────────────────────────────────────
 *
 *   features/conversation/
 *   ├── index.ts              ← this file (public API)
 *   ├── components/           ← re-exports from components/conversation/
 *   │   ├── index.ts          ← eager exports
 *   │   └── lazy.ts           ← lazy/dynamic exports for code splitting
 *   ├── hooks/                ← useConversationSession, useDomCapturePrint
 *   ├── state/                ← re-exports from lib/redux/chatConversations/
 *   ├── types/                ← all type re-exports
 *   ├── utils/                ← internalized utilities (resource parsing, print)
 *   └── DEPENDENCIES.md       ← external dependency manifest
 *
 * The actual component files live in components/conversation/ (shared component
 * directory) and state lives in lib/redux/chatConversations/ (Redux convention).
 * This feature directory provides a unified import surface and owns the
 * internalized utilities.
 */

// ============================================================================
// COMPONENTS (primary exports)
// ============================================================================

export { UnifiedChatWrapper } from '@/components/conversation/UnifiedChatWrapper';
export { ConversationShell } from '@/components/conversation/ConversationShell';
export { ConversationInput } from '@/components/conversation/ConversationInput';
export { MessageList } from '@/components/conversation/MessageList';
export { AssistantMessage } from '@/components/conversation/AssistantMessage';
export { UserMessage } from '@/components/conversation/UserMessage';
export { MessageErrorBoundary } from '@/components/conversation/MessageErrorBoundary';
export { StreamingContentBlocks } from '@/components/conversation/StreamingContentBlocks';
export { default as ToolCallVisualization } from '@/components/conversation/ToolCallVisualization';
export { default as MessageOptionsMenu } from '@/components/conversation/MessageOptionsMenu';

// ============================================================================
// HOOKS
// ============================================================================

export { useConversationSession } from '@/components/conversation/hooks/useConversationSession';
export { useDomCapturePrint } from './hooks/useDomCapturePrint';
export { usePublicChatProps } from './hooks/usePublicChatProps';
export { useAuthenticatedChatProps } from './hooks/useAuthenticatedChatProps';

// ============================================================================
// STATE (actions, selectors, thunks)
// ============================================================================

export { chatConversationsActions } from '@/lib/redux/chatConversations/slice';
export { sendMessage } from '@/lib/redux/chatConversations/thunks/sendMessage';
export { loadConversationHistory } from '@/lib/redux/chatConversations/thunks/loadConversationHistory';
export {
    selectMessages,
    selectIsStreaming,
    selectIsExecuting,
    selectSessionStatus,
    selectSessionError,
    selectConversationId,
    selectCurrentInput,
    selectResources,
    selectVariableDefaults,
    selectUIState,
    selectApiMode,
    selectChatModeConfig,
} from '@/lib/redux/chatConversations/selectors';

// ============================================================================
// UTILS (internalized)
// ============================================================================

export {
    parseResourcesFromMessage,
    messageContainsResources,
    extractMessageWithoutResources,
} from './utils/resource-parsing';

export { printMarkdownContent } from './utils/markdown-print';

// ============================================================================
// TYPES
// ============================================================================

export type { UnifiedChatWrapperProps } from '@/components/conversation/UnifiedChatWrapper';
export type { ConversationShellProps } from '@/components/conversation/ConversationShell';
export type { ConversationInputProps } from '@/components/conversation/ConversationInput';
export type { AssistantMessageProps } from '@/components/conversation/AssistantMessage';
export type { MessageOptionsMenuProps } from '@/components/conversation/MessageOptionsMenu';
export type { ConversationSessionConfig, ConversationSessionReturn } from '@/components/conversation/hooks/useConversationSession';
export type { UseDomCapturePrintReturn, DomCaptureOptions } from './hooks/useDomCapturePrint';
export type { PublicChatPropsConfig } from './hooks/usePublicChatProps';
export type { AuthenticatedChatPropsConfig } from './hooks/useAuthenticatedChatProps';
export type { ParsedResource } from './utils/resource-parsing';
export type {
    ConversationMessage,
    ConversationResource,
    ConversationSession,
    SessionStatus,
    SessionUIState,
    ApiMode,
    ChatModeConfig,
} from '@/lib/redux/chatConversations/types';
