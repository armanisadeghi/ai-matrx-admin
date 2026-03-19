/**
 * features/conversation/types — Type re-exports for the conversation feature.
 *
 * Centralizes all types so consumers import from one place.
 */

// Core conversation types from the Redux slice
export type {
    ConversationMessage,
    ConversationResource,
    ConversationSession,
    ChatConversationsState,
    SessionStatus,
    SessionUIState,
    MessageRole,
    MessageStatus,
    ApiMode,
    ChatModeConfig,
    StartSessionPayload,
    AddMessagePayload,
    UpdateMessagePayload,
    AppendStreamChunkPayload,
    PushStreamEventPayload,
    SetConversationIdPayload,
    SetCurrentInputPayload,
    UpdateVariablePayload,
    SetExpandedVariablePayload,
    AddResourcePayload,
    RemoveResourcePayload,
    UpdateUIStatePayload,
    LoadConversationPayload,
} from '@/features/cx-conversation/redux/types';

// Stream event types
export type { StreamEvent } from '@/types/python-generated/stream-events';

// Tool call types (from lib/api, not socket-io)
export type {
    ToolCallObject,
    ToolCallPhase,
    McpInputObject,
    StepDataObject,
} from '@/lib/api/tool-call.types';

// Hook types
export type {
    ConversationSessionConfig,
    ConversationSessionReturn,
} from '@/features/cx-conversation/hooks/useConversationSession';

// Component prop types
export type { UnifiedChatWrapperProps } from '@/features/cx-conversation/UnifiedChatWrapper';
export type { ConversationShellProps } from '@/features/cx-conversation/ConversationShell';
export type { ConversationInputProps } from '@/features/cx-conversation/ConversationInput';
export type { AssistantMessageProps } from '@/features/cx-conversation/AssistantMessage';
export type { MessageOptionsMenuProps } from '@/features/cx-conversation/MessageOptionsMenu';

// Internalized utility types
export type { ParsedResource } from '@/features/conversation/utils/resource-parsing';
