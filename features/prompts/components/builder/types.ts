import { PromptMessage, PromptVariable, PromptSettings } from "@/features/prompts/types/core";
import type { Resource } from "../resource-display";

// Message item type for full screen editor
export type MessageItem = { type: 'system'; index: -1 } | { type: 'message'; index: number };

// Shared props interface used by both mobile and desktop components
export interface PromptBuilderSharedProps {
    // Header props
    promptId?: string; // For mode switcher
    promptName: string;
    onPromptNameChange: (value: string) => void;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    developerMessage: string;
    onDeveloperMessageChange: (value: string) => void;
    fullPromptObject?: any;
    handleAcceptFullPrompt?: (optimizedObject: any) => void;
    handleAcceptFullPromptAsCopy?: (optimizedObject: any) => Promise<void>;

    // Modal states
    isFullScreenEditorOpen: boolean;
    setIsFullScreenEditorOpen: (value: boolean) => void;
    isSettingsModalOpen: boolean;
    setIsSettingsModalOpen: (value: boolean) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (value: boolean) => void;

    // Model and configuration
    models: any[];
    model: string;
    onModelChange: (value: string) => void;
    modelConfig: PromptSettings;
    setModelConfig: (config: PromptSettings | ((prev: PromptSettings) => PromptSettings)) => void;
    setIsDirty: (value: boolean) => void;

    // Variables
    variableDefaults: PromptVariable[];
    onAddVariable: (name: string, defaultValue: string, customComponent?: any, required?: boolean, helpText?: string) => void;
    onUpdateVariable: (oldName: string, newName: string, defaultValue: string, customComponent?: any, required?: boolean, helpText?: string) => void;
    onRemoveVariable: (variableName: string) => void;
    onVariableValueChange: (variableName: string, value: string) => void;
    expandedVariable: string | null;
    onExpandedVariableChange: (value: string | null) => void;

    // Tools
    availableTools?: any[];
    isAddingTool: boolean;
    onIsAddingToolChange: (value: boolean) => void;
    onAddTool: (tool: string) => void;
    onRemoveTool: (tool: string) => void;
    modelSupportsTools: boolean;

    // Settings
    showSettingsOnMainPage: boolean;

    // Developer/System message
    onDeveloperMessageClear: () => void;
    systemMessageVariablePopoverOpen: boolean;
    onSystemMessageVariablePopoverOpenChange: (value: boolean) => void;
    onInsertVariableIntoSystemMessage: (variable: string) => void;
    isEditingSystemMessage: boolean;
    onIsEditingSystemMessageChange: (value: boolean) => void;

    // Messages
    messages: PromptMessage[];
    editingMessageIndex: number | null;
    onEditingMessageIndexChange: (value: number | null) => void;
    variablePopoverOpen: number | null;
    onVariablePopoverOpenChange: (value: number | null) => void;
    onMessageRoleChange: (index: number, role: any) => void;
    onMessageContentChange: (index: number, content: string) => void;
    onClearMessage: (index: number) => void;
    onDeleteMessage: (index: number) => void;
    onInsertVariable: (messageIndex: number, variable: string) => void;
    onAddMessage: () => void;

    // Textarea refs and cursor positions
    textareaRefs: React.MutableRefObject<Record<number, HTMLTextAreaElement | null>>;
    cursorPositions: Record<number, number>;
    onCursorPositionChange: (positions: Record<number, number>) => void;

    // Full screen editor
    onOpenFullScreenEditor: (messageIndex: number) => void;
    fullScreenEditorInitialSelection: MessageItem | null;
    setFullScreenEditorInitialSelection: (value: MessageItem | null) => void;
    updateMessage: (index: number, content: string) => void;

    // Conversation/Testing
    conversationMessages: Array<{ 
        role: string; 
        content: string;
        taskId?: string;
        metadata?: {
            timeToFirstToken?: number;
            totalTime?: number;
            tokens?: number;
        }
    }>;
    onClearConversation: () => void;
    chatInput: string;
    onChatInputChange: (value: string) => void;
    resources: Resource[];
    onResourcesChange: (resources: Resource[]) => void;
    onSendMessage: () => void;
    isTestingPrompt: boolean;
    submitOnEnter: boolean;
    onSubmitOnEnterChange: (value: boolean) => void;
    autoClearResponsesInEditMode: boolean;
    onAutoClearResponsesInEditModeChange: (value: boolean) => void;
    isStreamingMessage: boolean;
    currentTaskId: string | null;
    messageStartTime: number | null;
    timeToFirstTokenRef: React.MutableRefObject<number | undefined>;
    lastMessageStats: {
        timeToFirstToken?: number;
        totalTime?: number;
        tokens?: number;
    } | null;
    attachmentCapabilities: {
        supportsImageUrls: boolean;
        supportsFileUrls: boolean;
        supportsYoutubeVideos: boolean;
    };
    onConversationMessageContentChange: (messageIndex: number, newContent: string) => void;

    // Settings modal
    initialData?: {
        id?: string;
        name?: string;
        messages?: PromptMessage[];
        variableDefaults?: PromptVariable[];
        settings?: Record<string, any>;
    };
    promptDescription: string;
    handleSettingsUpdate: (id: string, data: any) => void;
    handleLocalStateUpdate: (updates: any, isFromSave?: boolean) => void;
}