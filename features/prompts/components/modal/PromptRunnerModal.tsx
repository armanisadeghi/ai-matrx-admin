"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { createAndSubmitTask } from "@/lib/redux/socket-io/thunks/submitTaskThunk";
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { PromptRunnerInput } from "../PromptRunnerInput";
import { PromptUserMessage } from "../PromptUserMessage";
import { PromptAssistantMessage } from "../PromptAssistantMessage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, PanelRightClose, Loader2, AlertCircle, X } from "lucide-react";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout/AdaptiveLayout";
import { useCanvas } from "@/hooks/useCanvas";
import { useAiRun } from "@/features/ai-runs/hooks/useAiRun";
import { generateRunNameFromMessage } from "@/features/ai-runs/utils/name-generator";
import { calculateTaskCost } from "@/features/ai-runs/utils/cost-calculator";
import { v4 as uuidv4 } from "uuid";
import { PromptRunnerModalProps, PromptData } from "../../types/modal";
import { fetchAIModels } from "@/lib/api/ai-models-server";
import { AdditionalInfoModal } from "./AdditionalInfoModal";

// Dynamically import CanvasRenderer to avoid SSR issues
const CanvasRenderer = dynamic(
    () => import("@/components/layout/adaptive-layout/CanvasRenderer").then(mod => ({ default: mod.CanvasRenderer })),
    { ssr: false }
);

// Variable definition structure (reusing from PromptRunner)
export interface PromptVariable {
    name: string;
    defaultValue: string;
}

/**
 * PromptRunnerModal - A versatile modal for running prompts
 * 
 * Supports multiple execution modes:
 * - auto-run: Automatically executes with pre-filled variables
 * - manual-with-hidden-variables: User adds instructions, variables hidden
 * - manual-with-visible-variables: User can edit variables
 * - manual: Standard prompt runner (default)
 */
export function PromptRunnerModal({
    isOpen,
    onClose,
    promptId,
    promptData: initialPromptData,
    mode = 'manual',
    variables: initialVariables,
    initialMessage,
    onExecutionComplete,
    title,
    runId: initialRunId,
}: PromptRunnerModalProps) {
    const dispatch = useAppDispatch();
    const { isOpen: isCanvasOpen, close: closeCanvas, open: openCanvas, content: canvasContent } = useCanvas();
    
    // Prompt data state
    const [promptData, setPromptData] = useState<PromptData | null>(initialPromptData || null);
    const [models, setModels] = useState<any[]>([]);
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
    const [conversationMessages, setConversationMessages] = useState<Array<{ 
        role: string; 
        content: string;
        taskId?: string;
        metadata?: {
            timeToFirstToken?: number;
            totalTime?: number;
            tokens?: number;
        }
    }>>([]);
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
    const updateTaskTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Refs for auto-scrolling
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    
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
            // Desktop - just toggle the canvas open/close state
            if (isCanvasOpen) {
                closeCanvas();
            }
        }
    };
    
    // Load prompt data if only ID is provided
    useEffect(() => {
        if (isOpen && promptId && !initialPromptData) {
            setIsLoadingPrompt(true);
            setPromptError(null);
            
            Promise.all([
                fetch(`/api/prompts/${promptId}`).then(res => res.json()),
                fetchAIModels()
            ])
            .then(([promptResponse, aiModels]) => {
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
                setModels(aiModels);
            })
            .catch(err => {
                console.error('Error loading prompt:', err);
                setPromptError(err.message || 'Failed to load prompt');
            })
            .finally(() => {
                setIsLoadingPrompt(false);
            });
        } else if (isOpen && initialPromptData) {
            // Use provided prompt data
            setPromptData(initialPromptData);
            // Load models
            fetchAIModels().then(setModels);
        }
    }, [isOpen, promptId, initialPromptData]);
    
    // Show additional info modal for hidden-variables mode on open
    useEffect(() => {
        if (isOpen && mode === 'manual-with-hidden-variables' && !additionalInfoProvided && promptData) {
            setShowAdditionalInfoModal(true);
        }
    }, [isOpen, mode, additionalInfoProvided, promptData]);
    
    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
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
    }, [isOpen, isCanvasOpen, closeCanvas]);
    
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
            const mergedVariables = variableDefaultsFromPrompt.map(v => ({
                name: v.name,
                defaultValue: initialVariables?.[v.name] || v.defaultValue || ""
            }));
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
    
    // Helper function to replace variables in content
    const replaceVariables = (content: string): string => {
        let result = content;
        variableDefaults.forEach(({ name, defaultValue }) => {
            const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
            result = result.replace(regex, defaultValue);
        });
        return result;
    };
    
    
    // Build the messages to display
    const displayMessages = useMemo(() => {
        if (currentTaskId && streamingText) {
            return [...conversationMessages, { role: "assistant", content: streamingText, taskId: currentTaskId }];
        }
        return conversationMessages;
    }, [conversationMessages, currentTaskId, streamingText]);
    
    // Helper function to scroll to bottom
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    };
    
    // Auto-scroll when messages change
    useEffect(() => {
        if (displayMessages.length > 0) {
            scrollToBottom('smooth');
        }
    }, [displayMessages.length]);
    
    // Auto-scroll during streaming
    useEffect(() => {
        if (isTestingPrompt && streamingText) {
            const container = messagesContainerRef.current;
            if (container) {
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
                if (isNearBottom) {
                    scrollToBottom('auto');
                }
            }
        }
    }, [streamingText, isTestingPrompt]);
    
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
            
            const selectedModel = models.find(m => m.id === modelId);
            const cost = selectedModel?.model_name ? calculateTaskCost(selectedModel.model_name, 0, tokenCount) : 0;
            
            (async () => {
                try {
                    await completeTask(pendingTaskId, {
                        response_text: streamingText,
                        tokens_total: tokenCount,
                        time_to_first_token: timeToFirstTokenRef.current,
                        total_time: totalTime,
                        cost,
                    });
                    
                    if (run) {
                        await addMessage({
                            role: 'assistant',
                            content: streamingText,
                            taskId: pendingTaskId,
                            timestamp: new Date().toISOString(),
                            metadata: {
                                ...finalStats,
                                cost,
                            }
                        });
                    }
                    
                    // Call onExecutionComplete if provided
                    if (onExecutionComplete && run) {
                        onExecutionComplete({
                            runId: run.id,
                            response: streamingText,
                            metadata: {
                                tokens: tokenCount,
                                cost,
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
    }, [isResponseEnded, currentTaskId, isTestingPrompt, messageStartTime, streamingText, pendingTaskId, run, models, modelId, completeTask, addMessage, onExecutionComplete]);
    
    // Auto-execute for auto-run mode
    useEffect(() => {
        if (
            isOpen && 
            mode === 'auto-run' && 
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
    }, [isOpen, mode, hasAutoExecuted, promptData, variableDefaults, isLoadingPrompt]);
    
    // Auto-execute for hidden-variables mode after additional info is provided
    useEffect(() => {
        if (
            isOpen &&
            mode === 'manual-with-hidden-variables' &&
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
    }, [isOpen, mode, additionalInfoProvided, hasAutoExecuted, promptData, isLoadingPrompt]);
    
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
            
            // Hide first user message for auto-run and hidden-variables modes
            if (mode === 'auto-run' || mode === 'manual-with-hidden-variables') {
                shouldDisplayUserMessage = false;
            }
        } else {
            if (!chatInput.trim()) return;
            
            userMessageContent = chatInput;
            displayUserMessage = chatInput;
        }

        setChatInput("");

        const displayMessageWithReplacedVariables = replaceVariables(displayUserMessage);

        // Only add user message to display if it should be shown
        if (shouldDisplayUserMessage) {
            setConversationMessages((prev) => [...prev, { role: "user", content: displayMessageWithReplacedVariables }]);
        }

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

            if (isFirstMessage) {
                const lastPromptMessage = conversationTemplate.length > 0 ? conversationTemplate[conversationTemplate.length - 1] : null;
                const isLastMessageUser = lastPromptMessage?.role === "user";

                if (isLastMessageUser) {
                    const messagesWithoutLast = conversationTemplate.slice(0, -1);
                    messagesToSend = [...messagesWithoutLast, { role: "user", content: userMessageContent }];
                } else {
                    messagesToSend = [...conversationTemplate, { role: "user", content: userMessageContent }];
                }
            } else {
                messagesToSend = [...apiConversationHistory, { role: "user", content: userMessageContent }];
            }

            const allMessages = [{ role: "system", content: systemMessage }, ...messagesToSend];
            const messagesWithVariablesReplaced = allMessages.map(msg => ({
                ...msg,
                content: replaceVariables(msg.content)
            }));

            setApiConversationHistory((prev) => [...prev, { role: "user", content: userMessageContent }]);

            const chatConfig: Record<string, any> = {
                model_id: modelId,
                messages: messagesWithVariablesReplaced,
                stream: true,
                ...modelConfig,
            };
            
            const taskId = uuidv4();
            
            if (currentRun) {
                const selectedModel = models.find(m => m.id === modelId);
                
                try {
                    await createTask({
                        task_id: taskId,
                        service: 'chat_service',
                        task_name: 'direct_chat',
                        provider: selectedModel?.provider || 'unknown',
                        endpoint: selectedModel?.endpoint,
                        model: selectedModel?.model_name,
                        model_id: selectedModel?.id,
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
    const shouldShowVariables = 
        mode === 'manual-with-visible-variables' || 
        (mode === 'manual' && !conversationStarted);
    
    // Render loading state
    if (isLoadingPrompt) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0">
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Loading prompt...</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }
    
    // Render error state
    if (promptError || !promptData) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0">
                    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Failed to Load Prompt
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {promptError || 'Could not load prompt data'}
                            </p>
                        </div>
                        <Button onClick={onClose} variant="outline">
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
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
        onClose(); // Close the main modal too
    };
    
    // Main render
    return (
        <>
            {/* Additional Info Modal for hidden-variables mode */}
            {mode === 'manual-with-hidden-variables' && (
                <AdditionalInfoModal
                    isOpen={showAdditionalInfoModal}
                    onContinue={handleAdditionalInfoContinue}
                    onCancel={handleAdditionalInfoCancel}
                    promptName={promptData?.name || 'this prompt'}
                />
            )}
            
            <Dialog open={isOpen && !showAdditionalInfoModal} onOpenChange={onClose}>
            <DialogContent 
                className="max-w-[95vw] w-full h-[95vh] p-0 gap-0 overflow-hidden"
            >
                {/* Mobile Canvas Full Screen View */}
                {isMobile && showCanvasOnMobile && isCanvasOpen ? (
                    <div className="h-full flex flex-col bg-textured">
                        {/* Canvas Header */}
                        <div className="flex-none flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                    <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="flex-none flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                                {title || promptData.name || "Run Prompt"}
                            </h2>
                            <div className="flex items-center gap-2 flex-shrink-0 mr-10">
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
                                            <PanelRightClose className="w-4 h-4" />
                                        ) : (
                                            <PanelRightOpen className="w-4 h-4" />
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
                                    <div className="h-full w-full overflow-hidden relative">
                                        {/* Back Layer: Messages Area - Scrollable */}
                                        <div 
                                            ref={messagesContainerRef}
                                            className="absolute inset-0 overflow-y-auto scrollbar-hide" 
                                            style={{ 
                                                scrollbarWidth: 'none',
                                                msOverflowStyle: 'none',
                                                paddingBottom: '240px', // Space for input
                                            }}
                                        >
                                            {displayMessages.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 dark:text-gray-600 px-6">
                                                    <div className="text-center max-w-md">
                                                        <p className="text-lg font-medium mb-2">
                                                            {mode === 'auto-run' ? 'Starting execution...' : 'Ready to run your prompt'}
                                                        </p>
                                                        {mode === 'auto-run' ? (
                                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mt-4"></div>
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
                                            ) : (
                                                <div className="flex justify-center w-full px-6 pt-6">
                                                    <div className="w-full max-w-[800px] space-y-6">
                                                        {displayMessages.map((msg, idx) => {
                                                            const isLastMessage = idx === displayMessages.length - 1;
                                                            const isStreaming = isLastMessage && msg.role === "assistant" && isTestingPrompt;
                                                            
                                                            return (
                                                                <div key={idx}>
                                                                    {msg.role === "user" ? (
                                                                        <PromptUserMessage
                                                                            content={msg.content}
                                                                            messageIndex={idx}
                                                                        />
                                                                    ) : (
                                                                        <PromptAssistantMessage
                                                                            content={msg.content}
                                                                            taskId={msg.taskId}
                                                                            messageIndex={idx}
                                                                            isStreamActive={isStreaming}
                                                                            metadata={msg.metadata}
                                                                        />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        <div ref={messagesEndRef} className="h-4" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Front Layer: Input Area - Always visible, always in same spot */}
                                        <div className="absolute bottom-0 left-0 right-0 z-10 bg-textured pt-6 pb-4 px-6 pointer-events-none">
                                            <div className="pointer-events-auto max-w-[800px] mx-auto rounded-xl">
                                                <PromptRunnerInput
                                                    variableDefaults={variableDefaults}
                                                    onVariableValueChange={handleVariableValueChange}
                                                    expandedVariable={expandedVariable}
                                                    onExpandedVariableChange={setExpandedVariable}
                                                    chatInput={chatInput}
                                                    onChatInputChange={setChatInput}
                                                    onSendMessage={handleSendTestMessage}
                                                    isTestingPrompt={isTestingPrompt}
                                                    showVariables={shouldShowVariables}
                                                    messages={conversationTemplate}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                }
                            />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
        </>
    );
}

