// Public Chat Feature - Index
// Export all components, hooks, and utilities for the public chat feature

// Context
export { ChatProvider, useChatContext, useChatState, useChatActions } from './context/ChatContext';
export type { ChatMessage, ChatSettings, AgentConfig, ChatState } from './context/ChatContext';

// Types
export type {
    ContentItem,
    TextContentItem,
    ImageContentItem,
    AudioContentItem,
    VideoContentItem,
    DocumentContentItem,
    YouTubeContentItem,
    FileContentItem,
    WebpageContentItem,
    NoteContentItem,
    TaskContentItem,
    TableContentItem,
    PublicResource,
    PublicResourceType,
} from './types/content';
export { resourceToContentItem, buildContentArray } from './types/content';

// Hooks
export { useAgentChat } from './hooks/useAgentChat';

// Components
export { ChatContainer } from './components/ChatContainer';
export { ChatInput } from './components/ChatInput';
export { ChatInputWithControls } from './components/ChatInputWithControls';
export { MessageList } from './components/MessageDisplay';
export { VariableInputs } from './components/VariableInputs';
export type { VariableSchema } from './components/VariableInputs';
export { AgentSelector, AgentActionButtons, DEFAULT_AGENTS } from './components/AgentSelector';
