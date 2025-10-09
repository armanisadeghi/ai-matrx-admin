"use client";

import React, { useState, useEffect, useRef } from "react";

// Utility function to find all scrollable parent containers and preserve their scroll positions
const preserveAllScrollPositions = (element: HTMLElement, callback: () => void) => {
    const scrollableParents: Array<{ element: Element | Window, scrollTop: number, scrollLeft: number }> = [];
    
    // Save window scroll position
    scrollableParents.push({
        element: window,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop,
        scrollLeft: window.pageXOffset || document.documentElement.scrollLeft
    });
    
    // Find all scrollable parent elements
    let parent = element.parentElement;
    while (parent) {
        const computedStyle = window.getComputedStyle(parent);
        const overflowY = computedStyle.overflowY;
        const overflowX = computedStyle.overflowX;
        
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowX === 'auto' || overflowX === 'scroll') {
            scrollableParents.push({
                element: parent,
                scrollTop: parent.scrollTop,
                scrollLeft: parent.scrollLeft
            });
        }
        parent = parent.parentElement;
    }
    
    // Execute the callback (textarea resize)
    callback();
    
    // Restore all scroll positions using requestAnimationFrame
    const restoreScrollPositions = () => {
        scrollableParents.forEach(({ element, scrollTop, scrollLeft }) => {
            if (element === window) {
                window.scrollTo(scrollLeft, scrollTop);
            } else {
                (element as HTMLElement).scrollTop = scrollTop;
                (element as HTMLElement).scrollLeft = scrollLeft;
            }
        });
    };
    
    // Use multiple requestAnimationFrame calls to ensure restoration happens after all browser adjustments
    requestAnimationFrame(() => {
        restoreScrollPositions();
        requestAnimationFrame(() => {
            restoreScrollPositions();
            requestAnimationFrame(() => {
                restoreScrollPositions();
            });
        });
    });
};
import { usePromptsWithFetch, PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { useRouter, usePathname } from "next/navigation";
import { PromptBuilderHeader } from "./PromptBuilderHeader";
import { PromptBuilderRightPanel } from "./PromptBuilderRightPanel";
import { PromptBuilderLeftPanel } from "./PromptBuilderLeftPanel";
import { useModelControls, getModelDefaults } from "../hooks/useModelControls";
import { useAppSelector, useAppDispatch, RootState } from "@/lib/redux";
import { AiModelsPreferences } from "@/lib/redux/slices/userPreferencesSlice";
import { updateDebugData } from "@/lib/redux/slices/adminDebugSlice";
import ModelSettingsDialog from "@/app/(authenticated)/ai/prompts/test-controls/ModelSettingsDialog";
import { createAndSubmitTask } from "@/lib/redux/socket-io/thunks/submitTaskThunk";
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { FullScreenEditor } from "./FullScreenEditor";
import { PromptSettingsModal } from "./PromptSettingsModal";

type MessageRole = "system" | "user" | "assistant";

// Model configuration using snake_case for Python backend compatibility
interface ModelConfig {
    output_format?: string;
    tool_choice?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    top_k?: number;
    store?: boolean;
    stream?: boolean;
    parallel_tool_calls?: boolean;
    tools?: string[]; // Array of selected tool names
    image_urls?: boolean;
    file_urls?: boolean;
    internal_web_search?: boolean;
    youtube_videos?: boolean;
    reasoning_effort?: string;
    verbosity?: string;
    reasoning_summary?: string;
}

// Variable definition structure - single source of truth
export interface PromptVariable {
    name: string;
    defaultValue: string;
}

interface PromptBuilderProps {
    models: any[];
    initialData?: {
        id?: string;
        name?: string;
        messages?: PromptMessage[];
        variableDefaults?: PromptVariable[]; // Array of { name, defaultValue }
        settings?: Record<string, any>; // Single source of truth: { model_id: string, temperature: number, ... }
    };
}

export function PromptBuilder({ models, initialData }: PromptBuilderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useAppDispatch();
    const { createPrompt, updatePrompt } = usePromptsWithFetch();
    const modelPreferences = useAppSelector((state: RootState) => state.userPreferences.aiModels as AiModelsPreferences);

    
    if (!models || models.length === 0) {
        return <div className="p-8 text-center text-red-600">Error: No models available</div>;
    }
    
    // Determine if we're in edit mode based on whether we have an existing prompt ID
    const isEditMode = !!initialData?.id;
    
    // Get initial model ID from settings.model_id (single source of truth)
    const getInitialModelId = () => {
        if (initialData?.settings && typeof initialData.settings === 'object' && 'model_id' in initialData.settings) {
            return initialData.settings.model_id as string;
        }
        // Default for new prompts
        return modelPreferences?.defaultModel || models[0]?.id;
    };
    
    const initialModelId = getInitialModelId();
    const initialModel = models.find(m => m.id === initialModelId) || models[0];
    
    // Get initial modelConfig from settings (single source of truth)
    // Extract all settings except model_id - those are the config options
    const getInitialModelConfig = () => {
        const defaults = getModelDefaults(initialModel);
        
        if (initialData?.settings && typeof initialData.settings === 'object') {
            const { model_id, ...config } = initialData.settings as Record<string, any>;
            // Merge: saved settings take precedence, but add any new defaults that don't exist
            return { ...defaults, ...config };
        }
        
        // Default for new prompts
        return defaults;
    };
    
    // Extract system message and user/assistant messages from initialData
    const getInitialMessages = () => {
        if (initialData?.messages && initialData.messages.length > 0) {
            // Filter out system messages - they go in developerMessage
            return initialData.messages.filter(m => m.role !== "system");
        }
        return []; // Empty if no initial data provided
    };
    
    const getInitialDeveloperMessage = () => {
        if (initialData?.messages && initialData.messages.length > 0) {
            const systemMessage = initialData.messages.find(m => m.role === "system");
            if (systemMessage) return systemMessage.content;
        }
        return ""; // Empty if no initial data provided
    };
    
    // Core state - model state holds the model ID (UUID)
    const [promptName, setPromptName] = useState(initialData?.name || "");
    const [promptDescription, setPromptDescription] = useState(""); // TODO: Add to initialData when schema supports it
    const [model, setModel] = useState(initialModelId);
    const [modelConfig, setModelConfig] = useState<ModelConfig>(getInitialModelConfig());
    
    const [developerMessage, setDeveloperMessage] = useState(getInitialDeveloperMessage());
    const [messages, setMessages] = useState<PromptMessage[]>(getInitialMessages());
    
    // Get model controls to check capabilities
    const { normalizedControls } = useModelControls(models, model);
    
    // Check if the current model supports tools
    const modelSupportsTools = normalizedControls?.tools?.default ?? false;
    
    // Check attachment capabilities
    const supportsImageUrls = normalizedControls?.image_urls?.default ?? false;
    const supportsFileUrls = normalizedControls?.file_urls?.default ?? false;
    const supportsYoutubeVideos = normalizedControls?.youtube_videos?.default ?? false;

    // Update debug data when model controls or config changes
    useEffect(() => {
        dispatch(updateDebugData({
            'Model Controls': normalizedControls,
            'Current Settings': modelConfig,
            'Selected Model ID': model,
            'Unmapped Controls': normalizedControls?.unmappedControls,
        }));
    }, [normalizedControls, modelConfig, model, dispatch]);

    // Variables state - single source of truth
    const getInitialVariableDefaults = () => {
        if (initialData?.variableDefaults && Array.isArray(initialData.variableDefaults)) {
            return initialData.variableDefaults;
        }
        return []; // Empty if no initial data provided
    };
    
    const [variableDefaults, setVariableDefaults] = useState<PromptVariable[]>(getInitialVariableDefaults());
    const [newVariableName, setNewVariableName] = useState("");
    const [isAddingVariable, setIsAddingVariable] = useState(false);
    const [expandedVariable, setExpandedVariable] = useState<string | null>(null);

    // Tools state - available tools list
    const availableTools = ["web_search", "web_page_read", "get_news", "get_weather", "run_python_code", "make_html_page"];
    const [isAddingTool, setIsAddingTool] = useState(false);

    // Full-screen editor state
    type MessageItem = { type: 'system'; index: -1 } | { type: 'message'; index: number };
    const [isFullScreenEditorOpen, setIsFullScreenEditorOpen] = useState(false);
    const [fullScreenEditorInitialSelection, setFullScreenEditorInitialSelection] = useState<MessageItem | null>(null);

    // Settings modal state
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const [chatInput, setChatInput] = useState("");
    const [conversationMessages, setConversationMessages] = useState<Array<{ 
        role: string; 
        content: string;
        metadata?: {
            timeToFirstToken?: number;
            totalTime?: number;
            tokens?: number;
        }
    }>>([]);
    // Track the actual API conversation history (separate from template and display)
    const [apiConversationHistory, setApiConversationHistory] = useState<PromptMessage[]>([]);
    const [autoClear, setAutoClear] = useState(true);
    const [submitOnEnter, setSubmitOnEnter] = useState(false);
    const [isTestingPrompt, setIsTestingPrompt] = useState(false);
    const [lastMessageStats, setLastMessageStats] = useState<{
        timeToFirstToken?: number;
        totalTime?: number;
        tokens?: number;
    } | null>(null);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [messageStartTime, setMessageStartTime] = useState<number | null>(null);
    const timeToFirstTokenRef = useRef<number | undefined>(undefined);

    // Get streaming response from socket
    const streamingText = useAppSelector((state) => 
        currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ""
    );
    const isResponseEnded = useAppSelector((state) =>
        currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
    );

    // UI state
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingSystemMessage, setIsEditingSystemMessage] = useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [variablePopoverOpen, setVariablePopoverOpen] = useState<number | null>(null);
    const [systemMessageVariablePopoverOpen, setSystemMessageVariablePopoverOpen] = useState(false);
    const [cursorPositions, setCursorPositions] = useState<Record<number, number>>({});
    
    // Refs for textarea elements (including system message at index -1)
    const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

    // Load preferences from localStorage on mount
    useEffect(() => {
        const savedAutoClear = localStorage.getItem('promptBuilder_autoClear');
        const savedSubmitOnEnter = localStorage.getItem('promptBuilder_submitOnEnter');
        
        if (savedAutoClear !== null) {
            setAutoClear(savedAutoClear === 'true');
        }
        if (savedSubmitOnEnter !== null) {
            setSubmitOnEnter(savedSubmitOnEnter === 'true');
        }
    }, []);

    // Save autoClear preference to localStorage
    useEffect(() => {
        localStorage.setItem('promptBuilder_autoClear', String(autoClear));
    }, [autoClear]);

    // Save submitOnEnter preference to localStorage
    useEffect(() => {
        localStorage.setItem('promptBuilder_submitOnEnter', String(submitOnEnter));
    }, [submitOnEnter]);

    // Handler to add a new variable
    const handleAddVariable = () => {
        if (!newVariableName.trim()) return;

        // Sanitize: lowercase, alphanumeric + underscores only
        const sanitized = newVariableName.toLowerCase().replace(/[^a-z0-9_]/g, "");

        if (!sanitized) return;

        // Don't add duplicates
        if (variableDefaults.some(v => v.name === sanitized)) {
            setNewVariableName("");
            setIsAddingVariable(false);
            return;
        }

        setVariableDefaults((prev) => [...prev, { name: sanitized, defaultValue: "" }]);
        setNewVariableName("");
        setIsAddingVariable(false);
        setIsDirty(true);
    };

    // Handler to remove a variable
    const handleRemoveVariable = (variableName: string) => {
        setVariableDefaults((prev) => prev.filter((v) => v.name !== variableName));
        setIsDirty(true);
    };

    // Handler to update a variable's default value
    const handleUpdateVariableValue = (variableName: string, value: string) => {
        setVariableDefaults((prev) => 
            prev.map(v => v.name === variableName ? { ...v, defaultValue: value } : v)
        );
    };

    // Handler to add a tool - updates modelConfig directly
    const handleAddTool = (tool: string) => {
        const currentTools = modelConfig.tools || [];
        if (!currentTools.includes(tool)) {
            setModelConfig((prev) => ({
                ...prev,
                tools: [...currentTools, tool]
            }));
            setIsDirty(true);
        }
        setIsAddingTool(false);
    };

    // Handler to remove a tool - updates modelConfig directly
    const handleRemoveTool = (tool: string) => {
        const currentTools = modelConfig.tools || [];
        setModelConfig((prev) => ({
            ...prev,
            tools: currentTools.filter((t) => t !== tool)
        }));
        setIsDirty(true);
    };

    // Clear tools when switching to a model that doesn't support them
    useEffect(() => {
        const currentTools = modelConfig.tools || [];
        if (!modelSupportsTools && currentTools.length > 0) {
            setModelConfig((prev) => ({
                ...prev,
                tools: []
            }));
            setIsDirty(true);
        }
    }, [modelSupportsTools, modelConfig.tools]);

    // Keyboard shortcut for full-screen editor (Ctrl/Cmd + Shift + E)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                setIsFullScreenEditorOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Message handlers
    const addMessage = () => {
        // Determine next role - alternate between user and assistant
        const lastRole = messages.length > 0 ? messages[messages.length - 1].role : "user";
        const nextRole: MessageRole = lastRole === "user" ? "assistant" : "user";
        setMessages([...messages, { role: nextRole, content: "" }]);
        setIsDirty(true);
    };

    const updateMessage = (index: number, content: string) => {
        const updated = [...messages];
        updated[index] = { ...updated[index], content };
        setMessages(updated);
        setIsDirty(true);
    };

    const clearMessage = (index: number) => {
        const updated = [...messages];
        updated[index] = { ...updated[index], content: "" };
        setMessages(updated);
        setIsDirty(true);
    };

    const deleteMessage = (index: number) => {
        setMessages(messages.filter((_, i) => i !== index));
        setIsDirty(true);
    };

    const insertVariableIntoMessage = (messageIndex: number, variable: string) => {
        const textarea = textareaRefs.current[messageIndex];
        
        // Use the stored cursor position (captured when the "+ Variable" button was clicked)
        // This is important because the popover interaction may affect the textarea's selectionStart
        const currentContent = messages[messageIndex].content;
        const cursorPos = cursorPositions[messageIndex] ?? currentContent.length;
        
        const beforeCursor = currentContent.substring(0, cursorPos);
        const afterCursor = currentContent.substring(cursorPos);
        const newContent = beforeCursor + `{{${variable}}}` + afterCursor;

        const updated = [...messages];
        updated[messageIndex] = { ...updated[messageIndex], content: newContent };
        setMessages(updated);
        setIsDirty(true);

        // Update cursor position to after the inserted variable
        const newCursorPos = cursorPos + variable.length + 4; // +4 for the {{ and }}
        setCursorPositions({ ...cursorPositions, [messageIndex]: newCursorPos });

        // Focus the textarea and set cursor position
        if (textarea) {
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(newCursorPos, newCursorPos);
                // Prevent scrolling in all parent containers during auto-resize
                preserveAllScrollPositions(textarea, () => {
                    textarea.style.height = "auto";
                    textarea.style.height = textarea.scrollHeight + "px";
                });
            }, 0);
        }
    };

    const insertVariableIntoSystemMessage = (variable: string) => {
        const textarea = textareaRefs.current[-1]; // System message uses index -1
        
        // Use the stored cursor position (captured when the "+ Variable" button was clicked)
        const currentContent = developerMessage;
        const cursorPos = cursorPositions[-1] ?? currentContent.length;
        
        const beforeCursor = currentContent.substring(0, cursorPos);
        const afterCursor = currentContent.substring(cursorPos);
        const newContent = beforeCursor + `{{${variable}}}` + afterCursor;

        setDeveloperMessage(newContent);
        setIsDirty(true);

        // Update cursor position to after the inserted variable
        const newCursorPos = cursorPos + variable.length + 4; // +4 for the {{ and }}
        setCursorPositions({ ...cursorPositions, [-1]: newCursorPos });

        // Focus the textarea and set cursor position
        if (textarea) {
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(newCursorPos, newCursorPos);
                // Prevent scrolling in all parent containers during auto-resize
                preserveAllScrollPositions(textarea, () => {
                    textarea.style.height = "auto";
                    textarea.style.height = textarea.scrollHeight + "px";
                });
            }, 0);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const allMessages: PromptMessage[] = [{ role: "system", content: developerMessage }, ...messages];

            // Create a flat settings object that includes model_id and all model config
            const settings = {
                model_id: model, // The model UUID
                ...modelConfig,  // All the config options (temperature, max_tokens, tools, etc.)
            };

            // What gets saved to the database:
            // - name: string
            // - messages: array of message objects
            // - variableDefaults: array of { name, defaultValue } objects
            // - settings: flat JSONB with model_id and all config
            const promptData = {
                name: promptName,
                messages: allMessages,
                variableDefaults, // Already in the correct format: array of { name, defaultValue }
                settings,
            };

            if (isEditMode && initialData?.id) {
                // Update existing prompt - no routing needed, stay on current edit page
                updatePrompt(initialData.id, promptData as any);
                setIsDirty(false);
            } else {
                // Create new prompt and immediately route to its edit page
                // This prevents duplicate creation if user clicks save again before routing
                const result = await createPrompt(promptData as any);
                setIsDirty(false);
                
                // Route to the newly created prompt's edit page
                if (result?.id) {
                    router.push(`/ai/prompts/edit/${result.id}`);
                }
            }
        } catch (error) {
            console.error("Error saving prompt:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Helper function to replace variables in content
    const replaceVariables = (content: string): string => {
        let result = content;
        variableDefaults.forEach(({ name, defaultValue }) => {
            const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
            result = result.replace(regex, defaultValue);
        });
        return result;
    };

    // NOTE: We intentionally do NOT update state during streaming to avoid re-rendering
    // on every chunk. The right panel will use selectors to get the streaming text directly.
    // We only update state when the stream completes (see next useEffect).

    // Handle response completion - this is the ONLY place we update conversation state
    useEffect(() => {
        if (currentTaskId && isResponseEnded && isTestingPrompt && messageStartTime) {
            // Calculate final stats
            const totalTime = Math.round(performance.now() - messageStartTime);
            const tokenCount = Math.round(streamingText.length / 4);
            
            const finalStats = {
                timeToFirstToken: timeToFirstTokenRef.current,
                totalTime: totalTime,
                tokens: tokenCount
            };
            
            setLastMessageStats(finalStats);
            
            // Add the completed assistant message with content and metadata
            setConversationMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: streamingText,
                    metadata: finalStats
                }
            ]);

            // Add the assistant's response to the API conversation history
            setApiConversationHistory((prev) => [
                ...prev,
                { role: "assistant", content: streamingText }
            ]);

            // IMPORTANT: Reset state so the next submission works properly
            setCurrentTaskId(null);
            setIsTestingPrompt(false);
            setMessageStartTime(null);
            timeToFirstTokenRef.current = undefined;
        }
    }, [isResponseEnded, currentTaskId, isTestingPrompt, messageStartTime, streamingText]);

    // Test chat handler
    const handleSendTestMessage = async () => {
        if (isTestingPrompt) return;

        // Determine if this is the first message in the conversation
        const isFirstMessage = apiConversationHistory.length === 0;

        let userMessageContent: string;
        let displayUserMessage: string;

        if (isFirstMessage) {
            // First message: Use the template prompt
            const lastPromptMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const isLastMessageUser = lastPromptMessage?.role === "user";

            // If last message is not a user message, we need chat input
            if (!isLastMessageUser && !chatInput.trim()) return;

            if (isLastMessageUser) {
                // Combine the last user message with chatInput (if any)
                const lastMessageContent = lastPromptMessage.content;
                const additionalInput = chatInput.trim();
                
                userMessageContent = additionalInput 
                    ? `${lastMessageContent}\n${additionalInput}`
                    : lastMessageContent;
            } else {
                // Normal behavior: add chatInput as a new user message
                userMessageContent = chatInput;
            }

            displayUserMessage = userMessageContent;
        } else {
            // Subsequent messages: Just use the chat input
            if (!chatInput.trim()) return;
            
            userMessageContent = chatInput;
            displayUserMessage = chatInput;
        }

        if (autoClear) {
            setChatInput("");
        }

        // Replace variables in the display message before showing it
        const displayMessageWithReplacedVariables = replaceVariables(displayUserMessage);

        // Add user message to conversation display
        setConversationMessages((prev) => [...prev, { role: "user", content: displayMessageWithReplacedVariables }]);

        setIsTestingPrompt(true);
        setLastMessageStats(null); // Clear previous stats
        setMessageStartTime(performance.now()); // Start timing
        timeToFirstTokenRef.current = undefined; // Reset time to first token

        try {
            let messagesToSend: PromptMessage[];

            if (isFirstMessage) {
                // First message: Use template messages, replacing the last user message if needed
                const lastPromptMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                const isLastMessageUser = lastPromptMessage?.role === "user";

                if (isLastMessageUser) {
                    // Replace the last template message with our combined content
                    const messagesWithoutLast = messages.slice(0, -1);
                    messagesToSend = [...messagesWithoutLast, { role: "user", content: userMessageContent }];
                } else {
                    // Append the new user message
                    messagesToSend = [...messages, { role: "user", content: userMessageContent }];
                }
            } else {
                // Subsequent messages: Use conversation history + new user message
                messagesToSend = [...apiConversationHistory, { role: "user", content: userMessageContent }];
            }

            // Add system message and replace variables
            const allMessages = [{ role: "system", content: developerMessage }, ...messagesToSend];
            const messagesWithVariablesReplaced = allMessages.map(msg => ({
                ...msg,
                content: replaceVariables(msg.content)
            }));

            // Add the new user message to the API conversation history
            setApiConversationHistory((prev) => [...prev, { role: "user", content: userMessageContent }]);

            // Build chat_config for direct_chat task
            const chatConfig: Record<string, any> = {
                model_id: model,
                messages: messagesWithVariablesReplaced,
                stream: true,
                ...modelConfig,
            };

            // NOTE: We do NOT add an empty assistant placeholder here.
            // The right panel will display the streaming text using the taskId.
            // We only add the final message when streaming completes.

            // Submit the task using socket
            const result = await dispatch(createAndSubmitTask({
                service: "chat_service",
                taskName: "direct_chat",
                taskData: {
                    chat_config: chatConfig
                }
            })).unwrap();

            // Store the taskId for streaming
            setCurrentTaskId(result.taskId);
            
        } catch (error) {
            console.error("Error testing prompt:", error);
            setConversationMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to get response from AI" }]);
            // Reset state on error
            setIsTestingPrompt(false);
            setCurrentTaskId(null);
            setMessageStartTime(null);
            timeToFirstTokenRef.current = undefined;
        }
    };

    // Handle settings modal updates
    const handleSettingsUpdate = (id: string, data: { name: string; description?: string; variableDefaults: PromptVariable[] }) => {
        // Update the database using the existing updatePrompt method
        updatePrompt(id, data);
    };

    const handleLocalStateUpdate = (updates: { name?: string; description?: string; variableDefaults?: PromptVariable[] }) => {
        // Update local state to reflect changes immediately
        if (updates.name !== undefined) {
            setPromptName(updates.name);
        }
        if (updates.description !== undefined) {
            setPromptDescription(updates.description);
        }
        if (updates.variableDefaults !== undefined) {
            setVariableDefaults(updates.variableDefaults);
        }
        setIsDirty(true);
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
            {/* Header */}
            <PromptBuilderHeader
                promptName={promptName}
                onPromptNameChange={(value) => {
                    setPromptName(value);
                    setIsDirty(true);
                }}
                isDirty={isDirty}
                isSaving={isSaving}
                onSave={handleSave}
                onOpenFullScreenEditor={() => setIsFullScreenEditorOpen(true)}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
            />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Configuration */}
                <PromptBuilderLeftPanel
                    models={models}
                    model={model}
                    onModelChange={(value) => {
                        // value is always the model ID (UUID)
                        const newModel = models.find(m => m.id === value);
                        console.log('Model changed to:', value, newModel?.common_name);
                        setModel(value);
                        // Update config to match the new model's defaults
                        if (newModel) {
                            setModelConfig(getModelDefaults(newModel));
                        }
                        setIsDirty(true);
                    }}
                    modelConfig={modelConfig}
                    onSettingsClick={() => setIsSettingsOpen(true)}
                    variableDefaults={variableDefaults}
                    newVariableName={newVariableName}
                    onNewVariableNameChange={setNewVariableName}
                    isAddingVariable={isAddingVariable}
                    onIsAddingVariableChange={setIsAddingVariable}
                    onAddVariable={handleAddVariable}
                    onRemoveVariable={handleRemoveVariable}
                    selectedTools={modelConfig.tools || []}
                    availableTools={availableTools}
                    isAddingTool={isAddingTool}
                    onIsAddingToolChange={setIsAddingTool}
                    onAddTool={handleAddTool}
                    onRemoveTool={handleRemoveTool}
                    modelSupportsTools={modelSupportsTools}
                    developerMessage={developerMessage}
                    onDeveloperMessageChange={(value) => {
                        setDeveloperMessage(value);
                        setIsDirty(true);
                        // Auto-resize will be handled in the component
                    }}
                    onDeveloperMessageClear={() => setDeveloperMessage("")}
                    systemMessageVariablePopoverOpen={systemMessageVariablePopoverOpen}
                    onSystemMessageVariablePopoverOpenChange={setSystemMessageVariablePopoverOpen}
                    onInsertVariableIntoSystemMessage={insertVariableIntoSystemMessage}
                    isEditingSystemMessage={isEditingSystemMessage}
                    onIsEditingSystemMessageChange={setIsEditingSystemMessage}
                    messages={messages}
                    editingMessageIndex={editingMessageIndex}
                    onEditingMessageIndexChange={setEditingMessageIndex}
                    variablePopoverOpen={variablePopoverOpen}
                    onVariablePopoverOpenChange={setVariablePopoverOpen}
                    onMessageRoleChange={(index, role) => {
                        const updated = [...messages];
                        updated[index] = { ...updated[index], role };
                        setMessages(updated);
                        setIsDirty(true);
                    }}
                    onMessageContentChange={(index, content) => {
                        updateMessage(index, content);
                    }}
                    onClearMessage={clearMessage}
                    onDeleteMessage={deleteMessage}
                    onInsertVariable={insertVariableIntoMessage}
                    onAddMessage={addMessage}
                    textareaRefs={textareaRefs}
                    cursorPositions={cursorPositions}
                    onCursorPositionChange={setCursorPositions}
                    onOpenFullScreenEditor={(messageIndex) => {
                        if (messageIndex === -1) {
                            setFullScreenEditorInitialSelection({ type: 'system', index: -1 });
                        } else {
                            setFullScreenEditorInitialSelection({ type: 'message', index: messageIndex });
                        }
                        setIsFullScreenEditorOpen(true);
                    }}
                />

                {/* Right Panel - Preview & Testing */}
                <PromptBuilderRightPanel
                    conversationMessages={conversationMessages}
                    onClearConversation={() => {
                        setConversationMessages([]);
                        setApiConversationHistory([]);
                        setLastMessageStats(null);
                    }}
                    variableDefaults={variableDefaults}
                    onVariableValueChange={handleUpdateVariableValue}
                    expandedVariable={expandedVariable}
                    onExpandedVariableChange={setExpandedVariable}
                    chatInput={chatInput}
                    onChatInputChange={setChatInput}
                    onSendMessage={handleSendTestMessage}
                    isTestingPrompt={isTestingPrompt}
                    autoClear={autoClear}
                    onAutoClearChange={setAutoClear}
                    submitOnEnter={submitOnEnter}
                    onSubmitOnEnterChange={setSubmitOnEnter}
                    messages={messages}
                    isStreamingMessage={isTestingPrompt}
                    currentTaskId={currentTaskId}
                    messageStartTime={messageStartTime}
                    timeToFirstTokenRef={timeToFirstTokenRef}
                    lastMessageStats={lastMessageStats}
                    attachmentCapabilities={{
                        supportsImageUrls: supportsImageUrls,
                        supportsFileUrls: supportsFileUrls,
                        supportsYoutubeVideos: supportsYoutubeVideos,
                    }}
                    onMessageContentChange={(messageIndex, newContent) => {
                        setConversationMessages(prevMessages => {
                            const updatedMessages = [...prevMessages];
                            if (messageIndex >= 0 && messageIndex < updatedMessages.length) {
                                updatedMessages[messageIndex] = {
                                    ...updatedMessages[messageIndex],
                                    content: newContent
                                };
                            }
                            return updatedMessages;
                        });
                    }}
                />
            </div>

            {/* Model Settings Dialog */}
            <ModelSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                modelId={model}
                models={models}
                settings={modelConfig}
                onSettingsChange={setModelConfig}
            />

            {/* Full Screen Editor */}
            <FullScreenEditor
                isOpen={isFullScreenEditorOpen}
                onClose={() => {
                    setIsFullScreenEditorOpen(false);
                    setFullScreenEditorInitialSelection(null);
                }}
                developerMessage={developerMessage}
                onDeveloperMessageChange={(value) => {
                    setDeveloperMessage(value);
                    setIsDirty(true);
                }}
                messages={messages}
                onMessageContentChange={(index, content) => {
                    updateMessage(index, content);
                }}
                onMessageRoleChange={(index, role) => {
                    const updated = [...messages];
                    updated[index] = { ...updated[index], role };
                    setMessages(updated);
                    setIsDirty(true);
                }}
                initialSelection={fullScreenEditorInitialSelection}
                onAddMessage={addMessage}
            />

            {/* Settings Modal */}
            <PromptSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                promptId={initialData?.id}
                promptName={promptName}
                promptDescription={promptDescription}
                variableDefaults={variableDefaults}
                onUpdate={handleSettingsUpdate}
                onLocalStateUpdate={handleLocalStateUpdate}
            />
        </div>
    );
}

