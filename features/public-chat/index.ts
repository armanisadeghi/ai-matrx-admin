// Public Chat Feature - Index
// Export all components, hooks, and utilities for the public chat feature

// Context
export { ChatProvider, useChatContext, useChatState, useChatActions } from './context/ChatContext';
export type { ChatMessage, ChatSettings, AgentConfig, ChatState } from './context/ChatContext';
export { LayoutAgentContext, useLayoutAgent } from './context/LayoutAgentContext';
export type { LayoutAgentContextValue } from './context/LayoutAgentContext';

// Utils
export { resolveAgentFromId, DEFAULT_AGENT_CONFIG } from './utils/agent-resolver';

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
export { ChatInputWithControls } from './components/ChatInputWithControls';
export { MessageList } from './components/MessageDisplay';
export { PublicVariableInputs } from './components/PublicVariableInputs';
export { AgentSelector, AgentActionButtons, DEFAULT_AGENTS } from './components/AgentSelector';

// Resource Picker Components
export { 
    PublicResourcePickerMenu,
    PublicUploadResourcePicker,
    PublicImageUrlPicker,
    PublicFileUrlPicker,
    PublicYouTubePicker,
    PublicWebpagePicker,
} from './components/resource-picker';
