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
 *   ├── redux/                ← re-exports from @/features/cx-conversation/redux/
 *   ├── types/                ← all type re-exports
 *   ├── utils/                ← internalized utilities (resource parsing, print)
 *   └── DEPENDENCIES.md       ← external dependency manifest
 *
 * The actual component files live in components/conversation/ (shared component
 * directory) and redux lives in @/features/cx-conversation/redux/ (Redux convention).
 * This feature directory provides a unified import surface and owns the
 * internalized utilities.
 */

// ============================================================================
// COMPONENTS (primary exports)
// ============================================================================

export { UnifiedChatWrapper } from "@/features/cx-conversation/UnifiedChatWrapper";
export { ConversationShell } from "@/features/cx-conversation/ConversationShell";
export { ConversationInput } from "@/features/cx-conversation/ConversationInput";
export { MessageList } from "@/features/cx-conversation/MessageList";
export { AssistantMessage } from "@/features/cx-conversation/AssistantMessage";
export { UserMessage } from "@/features/cx-conversation/UserMessage";
export { MessageErrorBoundary } from "@/features/cx-conversation/MessageErrorBoundary";
export { default as ToolCallVisualization } from "@/features/cx-conversation/ToolCallVisualization";
export { default as MessageOptionsMenu } from "@/features/cx-conversation/MessageOptionsMenu";

// ============================================================================
// HOOKS
// ============================================================================

export { useConversationSession } from "@/features/cx-conversation/hooks/useConversationSession";
export { useDomCapturePrint } from "./hooks/useDomCapturePrint";
export { usePublicChatProps } from "./hooks/usePublicChatProps";
export { useAuthenticatedChatProps } from "./hooks/useAuthenticatedChatProps";

// ============================================================================
// STATE (actions, selectors, thunks)
// ============================================================================

export { chatConversationsActions } from "@/features/agents/redux/legacy-shims/cx-message-actions-slice";
export { sendMessage } from "@/features/agents/redux/legacy-shims/cx-message-actions-thunks";
export { loadConversationHistory } from "@/features/agents/redux/legacy-shims/cx-message-actions-thunks";
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
} from "@/features/agents/redux/legacy-shims/cx-message-actions-selectors";

// ============================================================================
// UTILS (internalized)
// ============================================================================

export {
  parseResourcesFromMessage,
  messageContainsResources,
  extractMessageWithoutResources,
} from "./utils/resource-parsing";

export { printMarkdownContent } from "./utils/markdown-print";

// ============================================================================
// TYPES
// ============================================================================

export type { UnifiedChatWrapperProps } from "@/features/cx-conversation/UnifiedChatWrapper";
export type { ConversationShellProps } from "@/features/cx-conversation/ConversationShell";
export type { ConversationInputProps } from "@/features/cx-conversation/ConversationInput";
export type { AssistantMessageProps } from "@/features/cx-conversation/AssistantMessage";
export type { MessageOptionsMenuProps } from "@/features/cx-conversation/MessageOptionsMenu";
export type {
  ConversationSessionConfig,
  ConversationSessionReturn,
} from "@/features/cx-conversation/hooks/useConversationSession";
export type {
  UseDomCapturePrintReturn,
  DomCaptureOptions,
} from "./hooks/useDomCapturePrint";
export type { PublicChatPropsConfig } from "./hooks/usePublicChatProps";
export type { AuthenticatedChatPropsConfig } from "./hooks/useAuthenticatedChatProps";
export type { ParsedResource } from "./utils/resource-parsing";
export type {
  ConversationMessage,
  ConversationResource,
  ConversationSession,
  SessionStatus,
  SessionUIState,
  ApiMode,
  ChatModeConfig,
} from "@/features/agents/redux/legacy-shims/cx-message-actions-types";
