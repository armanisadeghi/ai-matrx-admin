"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { createAndSubmitTask } from "@/lib/redux/socket-io/thunks/submitTaskThunk";
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { PromptMessage, PromptVariable } from "@/features/prompts/types/core";
import { ConversationWithInput, type ConversationMessage } from "@/features/prompts/components/conversation";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, PanelRightClose, Loader2, AlertCircle, X } from "lucide-react";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout/AdaptiveLayout";
import { useCanvas } from "@/hooks/useCanvas";
import { useAiRun } from "@/features/ai-runs/hooks/useAiRun";
import { generateRunNameFromMessage } from "@/features/ai-runs/utils/name-generator";
import { v4 as uuidv4 } from "uuid";
import {  PromptRunnerModalProps,
  PromptData,
  resolveExecutionConfig,
  type NewExecutionConfig
} from "@/features/prompts/types/modal";
import type { Resource } from "../resource-display";
import { AdditionalInfoModal } from "@/features/prompts/components/runner-tester/AdditionalInfoModal";
import { useResourceMessageFormatter } from "@/features/prompts/hooks/useResourceMessageFormatter";
import { replaceVariablesInText } from "@/features/prompts/utils/variable-resolver";

// Dynamically import CanvasRenderer to avoid SSR issues
const CanvasRenderer = dynamic(
    () => import("@/components/layout/adaptive-layout/CanvasRenderer").then(mod => ({ default: mod.CanvasRenderer })),
    { ssr: false }
);


export interface PromptRunnerProps {
    promptId?: string;
    promptData?: PromptData | null;
    
    /** Execution configuration */
    executionConfig?: Omit<NewExecutionConfig, 'result_display'>;
    
    variables?: Record<string, string>;
    initialMessage?: string;
    onExecutionComplete?: (result: { runId: string; response: string; metadata: any }) => void;
    title?: string;
    runId?: string;
    onClose?: () => void;
    className?: string;
    isActive?: boolean; // Used to control initialization/reset
}

/**
 * PromptRunner - Core prompt running functionality
 * 
 * This is the core component that handles prompt execution, conversation management,
 * and streaming responses. It can be used standalone in any container (Sheet, Modal, Page, etc.)
 * 
 * Supports multiple execution modes:
 * - auto-run: Automatically executes with pre-filled variables, allows conversation
 * - auto-run-one-shot: Automatically executes, no follow-up conversation
 * - manual-with-hidden-variables: User adds instructions, variables hidden
 * - manual-with-visible-variables: User can edit variables
 * - manual: Standard prompt runner (default)
 */
export function PromptRunner({
    promptId,
    promptData: initialPromptData,
    executionConfig,
    variables: initialVariables,
    initialMessage,
    onExecutionComplete,
    title,
    runId: initialRunId,
    onClose,
    className,
    isActive = true,
}: PromptRunnerProps) {
    const dispatch = useAppDispatch();
    const { isOpen: isCanvasOpen, close: closeCanvas, open: openCanvas, content: canvasContent } = useCanvas();
    const { formatMessageWithResources } = useResourceMessageFormatter();
    
    // Resolve execution configuration
    const resolvedConfig = useMemo(() => {
        return resolveExecutionConfig(executionConfig);
    }, [executionConfig]);
    
    // Extract execution flags for easy access
    const { auto_run: autoRun, allow_chat: allowChat, show_variables: showVariables, apply_variables: applyVariables } = resolvedConfig;
    
    // Prompt data state
    const [promptData, setPromptData] = useState<PromptData | null>(initialPromptData || null);
    const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
    const [promptError, setPromptError] = useState<string | null>(null);
    
    // Mobile detection and canvas state
    const [isMobile, setIsMobile] = useState(false);
    const [showCanvasOnMobile, setShowCanvasOnMobile] = useState(false);
    
    // State for variables - Initialize with provided variables or defaults
    const [variableDefaults, setVariableDefaults] = useState<PromptVariable[]>([]);
    const [expandedVariable, setExpandedVariable] = useState<string | null>(null);
    
    // Conversation state
    const [chatInput, setChatInput] = useState(initialMessage || "");
    const [resources, setResources] = useState<Resource[]>([]);
    const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
    const [apiConversationHistory, setApiConversationHistory] = useState<PromptMessage[]>([]);
    const [isTestingPrompt, setIsTestingPrompt] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [messageStartTime, setMessageStartTime] = useState<number | null>(null);
    const timeToFirstTokenRef = useRef<number | undefined>(undefined);
    
    // Track if conversation has started
    const [conversationStarted, setConversationStarted] = useState(false);
    const [hasAutoExecuted, setHasAutoExecuted] = useState(false);
    
    // Hidden variables mode state
    const [showAdditionalInfoModal, setShowAdditionalInfoModal] = useState(false);
    const [additionalInfoProvided, setAdditionalInfoProvided] = useState(false);
    
    // AI Runs tracking
    const { run, createRun, createTask, updateTask, completeTask, addMessage } = useAiRun(initialRunId || undefined);
    const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
    const updateTaskTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile && showCanvasOnMobile) {
                setShowCanvasOnMobile(false);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [showCanvasOnMobile]);
    
    // Handle canvas toggle for mobile
    const handleCanvasToggle = () => {
        if (isMobile) {
            if (isCanvasOpen) {
                setShowCanvasOnMobile(!showCanvasOnMobile);
            } else {
                setShowCanvasOnMobile(true);
            }
        } else {
            // Desktop - toggle the canvas open/close state
            if (isCanvasOpen) {
                closeCanvas();
            } else {
                // Reopen the canvas with the last content
                if (canvasContent) {
                    openCanvas(canvasContent);
                }
            }
        }
    };
    
    // Load prompt data if only ID is provided
    useEffect(() => {
        if (isActive && promptId && !initialPromptData) {
            setIsLoadingPrompt(true);
            setPromptError(null);
            
            fetch(`/api/prompts/${promptId}`)
                .then(res => res.json())
                .then(promptResponse => {
                    if (promptResponse.error) {
                        throw new Error(promptResponse.error);
                    }
                    
                    const normalizedData: PromptData = {
                        id: promptResponse.id,
                        name: promptResponse.name,
                        description: promptResponse.description,
                        messages: promptResponse.messages,
                        variableDefaults: promptResponse.variable_defaults || [],
                        settings: promptResponse.settings || {},
                    };
                    
                    setPromptData(normalizedData);
                })
                .catch(err => {
                    console.error('Error loading prompt:', err);
                    setPromptError(err.message || 'Failed to load prompt');
                })
                .finally(() => {
                    setIsLoadingPrompt(false);
                });
        } else if (isActive && initialPromptData) {
            // Use provided prompt data
            setPromptData(initialPromptData);
        }
    }, [isActive, promptId, initialPromptData]);
    
    // Show additional info modal for hidden-variables mode on open
    useEffect(() => {
        if (isActive && !autoRun && applyVariables && !showVariables && !additionalInfoProvided && promptData) {
            setShowAdditionalInfoModal(true);
        }
    }, [isActive, autoRun, applyVariables, showVariables, additionalInfoProvided, promptData]);
    
    // Reset state when component becomes inactive
    useEffect(() => {
        if (!isActive) {
            // Reset after animation
            const timeout = setTimeout(() => {
                // Clear conversation state
                setConversationMessages([]);
                setApiConversationHistory([]);
                setConversationStarted(false);
                setHasAutoExecuted(false);
                setAdditionalInfoProvided(false);
                setShowAdditionalInfoModal(false);
                setChatInput("");
                
                // Clear streaming/task state
                setCurrentTaskId(null);
                setIsTestingPrompt(false);
                setPendingTaskId(null);
                setMessageStartTime(null);
                timeToFirstTokenRef.current = undefined;
                setExpandedVariable(null);
                
                // Clear any pending task update timeouts
                if (updateTaskTimeoutRef.current) {
                    clearTimeout(updateTaskTimeoutRef.current);
                    updateTaskTimeoutRef.current = null;
                }
                
                if (isCanvasOpen) {
                    closeCanvas();
                }
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [isActive, isCanvasOpen, closeCanvas]);
    
    // Extract data from promptData
    const templateMessages = promptData?.messages || [];
    const variableDefaultsFromPrompt = promptData?.variableDefaults || promptData?.variable_defaults || [];
    const settings = promptData?.settings || {};
    
    // Get model ID and config from settings
    const modelId = settings.model_id;
    const { model_id, ...modelConfig } = settings;
    
    // Extract system message and user/assistant messages
    const systemMessage = templateMessages.find(m => m.role === "system")?.content || "";
    const conversationTemplate = templateMessages.filter(m => m.role !== "system");
    
    // Update variables when prompt loads or initial variables change
    useEffect(() => {
        if (variableDefaultsFromPrompt.length > 0) {
            const mergedVariables = variableDefaultsFromPrompt.map(v => {
                // If not applying variables, don't pre-fill - user enters their own
                if (!applyVariables) {
                    return {
                        ...v, // Preserve all properties including customComponent
                        defaultValue: ""
                    };
                }
                // For other modes, use provided variables or defaults
                return {
                    ...v, // Preserve all properties including customComponent
                    defaultValue: initialVariables?.[v.name] || v.defaultValue || ""
                };
            });
            setVariableDefaults(mergedVariables);
        }
    }, [variableDefaultsFromPrompt, initialVariables]);
    
    // Get streaming response from socket
    const streamingText = useAppSelector((state) => 
        currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ""
    );
    const isResponseEnded = useAppSelector((state) =>
        currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
    );
    
    // Build variable values map for replacement
    const variableValues = useMemo(() => {
        const values: Record<string, string> = {};
        variableDefaults.forEach(({ name, defaultValue }) => {
            values[name] = defaultValue;
        });
        return values;
    }, [variableDefaults]);
    
    // Helper function to replace variables in content (uses shared utility)
    const replaceVariables = useCallback((content: string): string => {
        return replaceVariablesInText(content, variableValues);
    }, [variableValues]);
    
    
    // Build the messages to display
    const displayMessages = useMemo(() => {
        if (currentTaskId && streamingText) {
            return [...conversationMessages, { role: "assistant", content: streamingText, taskId: currentTaskId }];
        }
        return conversationMessages;
    }, [conversationMessages, currentTaskId, streamingText]);
    
    // Debounced task update during streaming
    useEffect(() => {
        if (pendingTaskId && streamingText && isTestingPrompt) {
            if (updateTaskTimeoutRef.current) {
                clearTimeout(updateTaskTimeoutRef.current);
            }
            
            updateTaskTimeoutRef.current = setTimeout(() => {
                updateTask(pendingTaskId, {
                    response_text: streamingText,
                    status: 'streaming'
                }).catch(err => console.error('Error updating task:', err));
            }, 500);
        }
        
        return () => {
            if (updateTaskTimeoutRef.current) {
                clearTimeout(updateTaskTimeoutRef.current);
            }
        };
    }, [streamingText, pendingTaskId, isTestingPrompt, updateTask]);
    
    // Handle response completion
    useEffect(() => {
        if (currentTaskId && isResponseEnded && isTestingPrompt && messageStartTime && pendingTaskId) {
            const totalTime = Math.round(performance.now() - messageStartTime);
            const tokenCount = Math.round(streamingText.length / 4);
            
            const finalStats = {
                timeToFirstToken: timeToFirstTokenRef.current,
                totalTime: totalTime,
                tokens: tokenCount
            };
            
            
            setConversationMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: streamingText,
                    taskId: currentTaskId,
                    metadata: finalStats
                }
            ]);

            setApiConversationHistory((prev) => [
                ...prev,
                { role: "assistant", content: streamingText }
            ]);
            
            // Server will calculate cost based on model_id
            (async () => {
                try {
                    await completeTask(pendingTaskId, {
                        response_text: streamingText,
                        tokens_total: tokenCount,
                        time_to_first_token: timeToFirstTokenRef.current,
                        total_time: totalTime,
                        cost: 0, // Server will calculate this
                    });
                    
                    if (run) {
                        await addMessage({
                            role: 'assistant',
                            content: streamingText,
                            taskId: pendingTaskId,
                            timestamp: new Date().toISOString(),
                            metadata: {
                                ...finalStats,
                                cost: 0, // Server will calculate this
                            }
                        }, run.id); // Pass run ID to ensure message is added to correct run
                    }
                    
                    // Call onExecutionComplete if provided
                    if (onExecutionComplete && run) {
                        onExecutionComplete({
                            runId: run.id,
                            response: streamingText,
                            metadata: {
                                tokens: tokenCount,
                                cost: 0, // Server will calculate this
                                timeToFirstToken: timeToFirstTokenRef.current,
                                totalTime,
                            }
                        });
                    }
                } catch (err) {
                    console.error('Error completing task:', err);
                }
            })();

            setCurrentTaskId(null);
            setIsTestingPrompt(false);
            setMessageStartTime(null);
            setPendingTaskId(null);
            timeToFirstTokenRef.current = undefined;
        }
    }, [isResponseEnded, currentTaskId, isTestingPrompt, messageStartTime, streamingText, pendingTaskId, run, modelId, completeTask, addMessage, onExecutionComplete]);
    
    // Auto-execute for auto-run modes
    useEffect(() => {
        if (
            isActive && 
            autoRun && 
            !hasAutoExecuted && 
            promptData && 
            variableDefaults.length > 0 &&
            !isLoadingPrompt
        ) {
            // Check if all variables have values
            const allVariablesFilled = variableDefaults.every(v => v.defaultValue);
            
            if (allVariablesFilled) {
                setHasAutoExecuted(true);
                setConversationStarted(true);
                // Small delay to ensure UI is ready
                setTimeout(() => {
                    handleSendTestMessage();
                }, 100);
            }
        }
    }, [isActive, hasAutoExecuted, promptData, variableDefaults, isLoadingPrompt]);
    
    // Auto-execute for hidden-variables mode after additional info is provided
    useEffect(() => {
        if (
            isActive &&
            !autoRun &&
            applyVariables &&
            !showVariables &&
            additionalInfoProvided &&
            !hasAutoExecuted &&
            promptData &&
            !isLoadingPrompt
        ) {
            setHasAutoExecuted(true);
            setConversationStarted(true);
            // Small delay to ensure UI is ready
            setTimeout(() => {
                handleSendTestMessage();
            }, 100);
        }
    }, [isActive, additionalInfoProvided, hasAutoExecuted, promptData, isLoadingPrompt]);
    
    // Handler to send message
    const handleSendTestMessage = async () => {
        if (isTestingPrompt || !promptData) return;

        const isFirstMessage = apiConversationHistory.length === 0;

        let userMessageContent: string;
        let displayUserMessage: string;
        let shouldDisplayUserMessage = true;

        if (isFirstMessage) {
            setConversationStarted(true);
            
            const lastPromptMessage = conversationTemplate.length > 0 ? conversationTemplate[conversationTemplate.length - 1] : null;
            const isLastMessageUser = lastPromptMessage?.role === "user";

            if (!isLastMessageUser && !chatInput.trim()) return;

            if (isLastMessageUser) {
                const lastMessageContent = lastPromptMessage.content;
                const additionalInput = chatInput.trim();
                
                userMessageContent = additionalInput 
                    ? `${lastMessageContent}\n${additionalInput}`
                    : lastMessageContent;
            } else {
                userMessageContent = chatInput;
            }

            displayUserMessage = userMessageContent;
            
            // Hide first user message for auto-run and when variables are hidden
            if (autoRun || (applyVariables && !showVariables)) {
                shouldDisplayUserMessage = false;
            }
        } else {
            if (!chatInput.trim()) return;
            
            userMessageContent = chatInput;
            displayUserMessage = chatInput;
        }

        // Format message with resources before sending
        const { formattedMessage, settingsAttachments, metadata } = await formatMessageWithResources(userMessageContent, resources);
        
        // Use formatted message for API
        userMessageContent = formattedMessage;
        
        // Also update display message to include resources for UI rendering
        displayUserMessage = formattedMessage;

        setChatInput("");
        setResources([]); // Clear resources after sending

        const displayMessageWithReplacedVariables = replaceVariables(displayUserMessage);

        // Only add user message to display if it should be shown
        if (shouldDisplayUserMessage) {
            setConversationMessages((prev) => [...prev, { role: "user", content: displayMessageWithReplacedVariables }]);
        }
        
        // Note: settingsAttachments (image_url, file_url, youtube, etc.) will be added to chatConfig below
        // metadata (files array, resources array) will be attached to the user message

        setIsTestingPrompt(true);
        setMessageStartTime(performance.now());
        timeToFirstTokenRef.current = undefined;

        try {
            let currentRun = run;
            if (isFirstMessage && !run) {
                const runName = generateRunNameFromMessage(displayUserMessage);
                const variableValues: Record<string, string> = {};
                variableDefaults.forEach(v => {
                    variableValues[v.name] = v.defaultValue;
                });
                
                currentRun = await createRun({
                    source_type: 'prompt',
                    source_id: promptData.id,
                    name: runName,
                    settings: settings,
                    variable_values: variableValues,
                });
            }
            
            let messagesToSend: PromptMessage[];
            
            // Create user message with metadata (files and resource references)
            const userMessage: PromptMessage = {
                role: "user",
                content: userMessageContent,
                ...(Object.keys(metadata).length > 0 && { metadata })
            };

            if (isFirstMessage) {
                const lastPromptMessage = conversationTemplate.length > 0 ? conversationTemplate[conversationTemplate.length - 1] : null;
                const isLastMessageUser = lastPromptMessage?.role === "user";

                if (isLastMessageUser) {
                    const messagesWithoutLast = conversationTemplate.slice(0, -1);
                    messagesToSend = [...messagesWithoutLast, userMessage];
                } else {
                    messagesToSend = [...conversationTemplate, userMessage];
                }
            } else {
                messagesToSend = [...apiConversationHistory, userMessage];
            }

            const allMessages = [{ role: "system", content: systemMessage }, ...messagesToSend];
            const messagesWithVariablesReplaced = allMessages.map(msg => ({
                ...msg,
                content: replaceVariables(msg.content)
            }));

            // Update API conversation history with metadata
            setApiConversationHistory((prev) => [...prev, userMessage]);

            const chatConfig: Record<string, any> = {
                model_id: modelId,
                messages: messagesWithVariablesReplaced,
                stream: true,
                ...modelConfig,
            };
            
            const taskId = uuidv4();
            
            if (currentRun) {
                try {
                    await createTask({
                        task_id: taskId,
                        service: 'chat_service',
                        task_name: 'direct_chat',
                        model_id: modelId,
                        request_data: chatConfig,
                    }, currentRun.id);
                    
                    setPendingTaskId(taskId);
                    
                    await addMessage({
                        role: 'user',
                        content: displayMessageWithReplacedVariables,
                        timestamp: new Date().toISOString(),
                    }, currentRun.id);
                } catch (err) {
                    console.error('Error creating task or adding message:', err);
                }
            }

            const result = await dispatch(createAndSubmitTask({
                service: "chat_service",
                taskName: "direct_chat",
                taskData: {
                    chat_config: chatConfig
                },
                customTaskId: taskId,
            })).unwrap();

            setCurrentTaskId(result.taskId);
            
        } catch (error) {
            console.error("Error testing prompt:", error);
            setConversationMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to get response from AI" }]);
            setIsTestingPrompt(false);
            setCurrentTaskId(null);
            setMessageStartTime(null);
            timeToFirstTokenRef.current = undefined;
        }
    };
    
    const handleVariableValueChange = (variableName: string, value: string) => {
        setVariableDefaults((prev) => 
            prev.map(v => v.name === variableName ? { ...v, defaultValue: value } : v)
        );
    };
    
    // Determine if variables should be shown
    // Hide variables after first message for all modes since they only affect initial prompt
    const shouldShowVariables = 
        !conversationStarted && showVariables;
    
    // Render loading state
    if (isLoadingPrompt) {
        return (
            <div className={`flex flex-col items-center justify-center h-full gap-4 ${className || ''}`}>
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading prompt...</p>
            </div>
        );
    }
    
    // Render error state
    if (promptError || !promptData) {
        return (
            <div className={`flex flex-col items-center justify-center h-full gap-4 p-8 ${className || ''}`}>
                <div className="p-3 bg-destructive/10 rounded-full">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        Failed to Load Prompt
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {promptError || 'Could not load prompt data'}
                    </p>
                </div>
                {onClose && (
                    <Button onClick={onClose} variant="outline">
                        Close
                    </Button>
                )}
            </div>
        );
    }
    
    // Handle additional info modal
    const handleAdditionalInfoContinue = (info?: string) => {
        if (info) {
            setChatInput(info);
        }
        setAdditionalInfoProvided(true);
        setShowAdditionalInfoModal(false);
    };
    
    const handleAdditionalInfoCancel = () => {
        setShowAdditionalInfoModal(false);
        if (onClose) {
            onClose();
        }
    };
    
    // Main render
    return (
        <>
            {/* Additional Info Modal for hidden-variables mode */}
            {!autoRun && applyVariables && !showVariables && (
                <AdditionalInfoModal
                    isOpen={showAdditionalInfoModal}
                    onContinue={handleAdditionalInfoContinue}
                    onCancel={handleAdditionalInfoCancel}
                    promptName={promptData?.name || 'this prompt'}
                />
            )}
            
            {/* Mobile Canvas Full Screen View */}
            {isMobile && showCanvasOnMobile && isCanvasOpen ? (
                <div className={`h-full flex flex-col bg-textured ${className || ''}`}>
                    {/* Canvas Header */}
                    <div className="flex-none flex items-center justify-between px-4 py-3 bg-card border-b border-border">
                        <h3 className="text-sm font-semibold text-foreground">
                            Canvas
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCanvasOnMobile(false)}
                            className="h-8 w-8 p-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    {/* Canvas Content */}
                    <div className="flex-1 overflow-hidden">
                        <CanvasRenderer content={canvasContent} />
                    </div>
                </div>
            ) : (
                <div className={`h-full flex flex-col ${className || ''}`}>
                    {/* Header */}
                    <div className="flex-none flex items-center justify-between px-4 py-3 bg-card border-b border-border">
                        <h2 className="text-base font-semibold text-foreground truncate flex-1">
                            {title || promptData.name || "Run Prompt"}
                        </h2>
                        <div className="flex items-center gap-2 flex-shrink-0 pr-8">
                            {/* Only show canvas toggle if canvas has content */}
                            {canvasContent && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCanvasToggle}
                                    className="h-8 w-8 p-0"
                                    title={isMobile && showCanvasOnMobile ? "Back to conversation" : isCanvasOpen ? "Close canvas" : "Open canvas"}
                                >
                                    {isMobile && showCanvasOnMobile ? (
                                        <X className="w-4 h-4" />
                                    ) : isCanvasOpen ? (
                                        <PanelRightClose className="w-5 h-5" />
                                    ) : (
                                        <PanelRightOpen className="w-5 h-5" />
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                    
                    {/* Main content with AdaptiveLayout */}
                    <div className="flex-1 overflow-hidden relative">
                        <AdaptiveLayout
                            className="h-full bg-textured"
                            disableAutoCanvas={isMobile}
                            rightPanel={
                                <ConversationWithInput
                                    messages={displayMessages}
                                    isStreaming={isTestingPrompt}
                                    emptyState={
                                        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground px-6">
                                            <div className="text-center max-w-2xl">
                                                <p className="text-lg font-medium mb-2">
                                                    {autoRun ? 'Starting execution...' : 'Ready to run your prompt'}
                                                </p>
                                                {autoRun ? (
                                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mt-4"></div>
                                                ) : (
                                                    <p className="text-sm">
                                                        {variableDefaults.length > 0 
                                                            ? shouldShowVariables 
                                                                ? "Fill in the variables below and send your message"
                                                                : "Type your message to continue"
                                                            : "Type your message below to get started"}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    }
                                    variableDefaults={variableDefaults}
                                    onVariableValueChange={handleVariableValueChange}
                                    expandedVariable={expandedVariable}
                                    onExpandedVariableChange={setExpandedVariable}
                                    chatInput={chatInput}
                                    onChatInputChange={setChatInput}
                                    onSendMessage={handleSendTestMessage}
                                    showVariables={shouldShowVariables}
                                    templateMessages={conversationTemplate}
                                    resources={resources}
                                    onResourcesChange={setResources}
                                    enablePasteImages={true}
                                    hideInput={autoRun && !allowChat && conversationStarted}
                                />
                            }
                        />
                    </div>
                </div>
            )}
        </>
    );
}

