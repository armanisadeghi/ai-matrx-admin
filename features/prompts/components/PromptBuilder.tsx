"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePromptsWithFetch, PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { useRouter } from "next/navigation";
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

interface PromptBuilderProps {
    models: any[];
    initialData?: {
        id?: string;
        name?: string;
        messages?: PromptMessage[];
        model?: string;
        modelConfig?: ModelConfig;
        variables?: string[];
        variableDefaults?: Record<string, string>;
    };
}

export function PromptBuilder({ models, initialData }: PromptBuilderProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { createPrompt, updatePrompt } = usePromptsWithFetch();
    const modelPreferences = useAppSelector((state: RootState) => state.userPreferences.aiModels as AiModelsPreferences);
    
    // Ensure we have models
    if (!models || models.length === 0) {
        return <div className="p-8 text-center text-red-600">Error: No models available</div>;
    }
    
    // Initialize from existing data or defaults
    const isEditMode = !!initialData?.id;
    
    // Get initial model ID
    const getInitialModelId = () => {
        if (initialData?.model) return initialData.model;
        return modelPreferences?.defaultModel || models[0]?.id;
    };
    
    const initialModelId = getInitialModelId();
    const initialModel = models.find(m => m.id === initialModelId) || models[0];
    
    // Get initial modelConfig (merge defaults with existing)
    const getInitialModelConfig = () => {
        const defaults = getModelDefaults(initialModel);
        if (initialData?.modelConfig) {
            // Merge: existing config takes precedence, but add any new defaults
            return { ...defaults, ...initialData.modelConfig };
        }
        return defaults;
    };
    
    // Extract system message and user/assistant messages from initialData
    const getInitialMessages = () => {
        if (initialData?.messages && initialData.messages.length > 0) {
            // Filter out system messages - they go in developerMessage
            return initialData.messages.filter(m => m.role !== "system");
        }
        return [{ role: "user", content: "Do you know about {{city}}?\n\nI'm looking for {{what}} there.\n\nCan you help me?" }];
    };
    
    const getInitialDeveloperMessage = () => {
        if (initialData?.messages && initialData.messages.length > 0) {
            const systemMessage = initialData.messages.find(m => m.role === "system");
            if (systemMessage) return systemMessage.content;
        }
        return "You're a very helpful assistant";
    };
    
    // Core state - model state holds the model ID (UUID)
    const [promptName, setPromptName] = useState(initialData?.name || "New prompt");
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

    // Variables state - initialize from initialData or defaults
    const getInitialVariables = () => {
        if (initialData?.variables) return initialData.variables;
        return ["city", "what"];
    };
    
    const [variables, setVariables] = useState<string[]>(getInitialVariables());
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

    // Testing state - initialize from variableDefaults or defaults
    const getInitialTestVariables = () => {
        if (initialData?.variableDefaults) return initialData.variableDefaults;
        return { city: "New York", what: "Hotels" };
    };
    
    const [testVariables, setTestVariables] = useState<Record<string, string>>(getInitialTestVariables());
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
    const [timeToFirstToken, setTimeToFirstToken] = useState<number | undefined>(undefined);

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

    // Update test variables when variables change
    useEffect(() => {
        setTestVariables((prev) => {
            const newVars = { ...prev };
            variables.forEach((v) => {
                if (!(v in newVars)) {
                    newVars[v] = "";
                }
            });
            return newVars;
        });
    }, [variables]);

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
        if (variables.includes(sanitized)) {
            setNewVariableName("");
            setIsAddingVariable(false);
            return;
        }

        setVariables((prev) => [...prev, sanitized]);
        setNewVariableName("");
        setIsAddingVariable(false);
        setIsDirty(true);
    };

    // Handler to remove a variable
    const handleRemoveVariable = (variable: string) => {
        setVariables((prev) => prev.filter((v) => v !== variable));
        setTestVariables((prev) => {
            const newVars = { ...prev };
            delete newVars[variable];
            return newVars;
        });
        setIsDirty(true);
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
                // Auto-resize
                textarea.style.height = "auto";
                textarea.style.height = textarea.scrollHeight + "px";
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
                // Auto-resize
                textarea.style.height = "auto";
                textarea.style.height = textarea.scrollHeight + "px";
            }, 0);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const allMessages: PromptMessage[] = [{ role: "system", content: developerMessage }, ...messages];

            const variableDefaults: Record<string, string> = {};
            variables.forEach((v) => {
                variableDefaults[v] = testVariables[v] || "";
            });

            const promptData = {
                name: promptName,
                messages: allMessages,
                variableDefaults,
                model,
                modelConfig, // Use modelConfig directly - it's already clean
                variables,
            };

            if (isEditMode && initialData?.id) {
                // Update existing prompt
                updatePrompt(initialData.id, promptData as Parameters<typeof updatePrompt>[1]);
            } else {
                // Create new prompt
                await createPrompt(promptData as Parameters<typeof createPrompt>[0]);
            }

            setIsDirty(false);
            router.push("/ai/prompts");
        } catch (error) {
            console.error("Error saving prompt:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Helper function to replace variables in content
    const replaceVariables = (content: string): string => {
        let result = content;
        Object.entries(testVariables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            result = result.replace(regex, value);
        });
        return result;
    };

    // Update conversation messages with streaming text and track timing
    useEffect(() => {
        if (currentTaskId && streamingText && isTestingPrompt && messageStartTime) {
            // Track time to first token (only once)
            if (timeToFirstToken === undefined && streamingText.length > 0) {
                const ttft = Math.round(performance.now() - messageStartTime);
                setTimeToFirstToken(ttft);
            }

            // Calculate current stats
            const currentTime = Math.round(performance.now() - messageStartTime);
            const tokenCount = Math.round(streamingText.length / 4); // Rough token estimation: ~4 chars = 1 token

            setLastMessageStats({
                timeToFirstToken: timeToFirstToken,
                totalTime: currentTime,
                tokens: tokenCount
            });

            setConversationMessages((prev) => {
                // Check if last message is assistant
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === "assistant") {
                    // Update the last assistant message with streaming text
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        ...lastMsg,
                        content: streamingText,
                    };
                    return updated;
                }
                return prev;
            });
        }
    }, [streamingText, currentTaskId, isTestingPrompt, messageStartTime, timeToFirstToken]);

    // Handle response completion
    useEffect(() => {
        if (currentTaskId && isResponseEnded && isTestingPrompt && messageStartTime) {
            // Calculate final stats
            const totalTime = Math.round(performance.now() - messageStartTime);
            const tokenCount = Math.round(streamingText.length / 4);
            
            const finalStats = {
                timeToFirstToken: timeToFirstToken,
                totalTime: totalTime,
                tokens: tokenCount
            };
            
            setLastMessageStats(finalStats);
            
            // Update the last message with metadata
            setConversationMessages((prev) => {
                const updated = [...prev];
                if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        metadata: finalStats
                    };
                }
                return updated;
            });

            // Add the assistant's response to the API conversation history
            setApiConversationHistory((prev) => [
                ...prev,
                { role: "assistant", content: streamingText }
            ]);

            // IMPORTANT: Reset the taskId so the next submission works properly
            setCurrentTaskId(null);
            setIsTestingPrompt(false);
            setMessageStartTime(null);
            setTimeToFirstToken(undefined);
        }
    }, [isResponseEnded, currentTaskId, isTestingPrompt, messageStartTime, streamingText, timeToFirstToken]);

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
        setTimeToFirstToken(undefined); // Reset time to first token

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

            // Add an empty assistant message placeholder
            setConversationMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
            setTimeToFirstToken(undefined);
        }
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
                    variables={variables}
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
                    variables={variables}
                    testVariables={testVariables}
                    onTestVariableChange={(variable, value) =>
                        setTestVariables({ ...testVariables, [variable]: value })
                    }
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
                    lastMessageStats={lastMessageStats}
                    attachmentCapabilities={{
                        supportsImageUrls: supportsImageUrls,
                        supportsFileUrls: supportsFileUrls,
                        supportsYoutubeVideos: supportsYoutubeVideos,
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
        </div>
    );
}

