"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { createAndSubmitTask } from "@/lib/redux/socket-io/thunks/submitTaskThunk";
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { PromptMessage, PromptVariable } from "@/features/prompts/types/core";
import { PromptRunnerInput } from "./PromptRunnerInput";
import { PromptUserMessage } from "./builder/PromptUserMessage";
import { PromptAssistantMessage } from "./builder/PromptAssistantMessage";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout/AdaptiveLayout";
import type { Resource } from "./resource-display";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, PanelRightOpen, PanelRightClose, RotateCcw, PanelLeftOpen, PanelLeftClose, FilePlus } from "lucide-react";
import { PageSpecificHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { useCanvas } from "@/hooks/useCanvas";
import { useAiRun } from "@/features/ai-runs/hooks/useAiRun";
import { generateRunNameFromMessage } from "@/features/ai-runs/utils/name-generator";
import { PromptRunsSidebar } from "@/features/ai-runs/components/PromptRunsSidebar";
import { PromptRunnerModalSidebarTester } from "./modal/PromptRunnerModalSidebarTester";
import { v4 as uuidv4 } from "uuid";
import { useIsMobile } from "@/hooks/use-mobile";

// Dynamically import CanvasRenderer to avoid SSR issues
const CanvasRenderer = dynamic(
    () => import("@/components/layout/adaptive-layout/CanvasRenderer").then(mod => ({ default: mod.CanvasRenderer })),
    { ssr: false }
);

interface PromptRunnerProps {
    models: any[];
    promptData: {
        id: string;
        name: string;
        messages: PromptMessage[];
        variableDefaults: PromptVariable[];
        settings: Record<string, any>;
    };
}

export function PromptRunner({ models, promptData }: PromptRunnerProps) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isOpen: isCanvasOpen, close: closeCanvas, open: openCanvas, content: canvasContent } = useCanvas();
    
    // Get runId from URL query parameter
    const urlRunId = searchParams.get('runId');
    
    // Mobile detection using consistent hook
    const isMobile = useIsMobile();
    const [showCanvasOnMobile, setShowCanvasOnMobile] = useState(false);
    const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(false);
    
    // Auto-close mobile views when resizing to desktop
    useEffect(() => {
        if (!isMobile) {
            if (showCanvasOnMobile) setShowCanvasOnMobile(false);
            if (showSidebarOnMobile) setShowSidebarOnMobile(false);
        }
    }, [isMobile, showCanvasOnMobile, showSidebarOnMobile]);
    
    // Handle canvas toggle for mobile
    const handleCanvasToggle = () => {
        if (isMobile) {
            if (isCanvasOpen) {
                // If canvas is open, toggle the mobile view
                setShowCanvasOnMobile(!showCanvasOnMobile);
            } else {
                // Open canvas and show it on mobile
                openCanvas({ 
                    type: 'html', 
                    data: '<div class="p-6"><p class="text-muted-foreground">Canvas panel - content will appear here</p></div>',
                    metadata: { title: 'Canvas' }
                });
                setShowCanvasOnMobile(true);
            }
        } else {
            // Desktop behavior - toggle canvas panel
            if (isCanvasOpen) {
                closeCanvas();
            } else {
                openCanvas({ 
                    type: 'html', 
                    data: '<div class="p-6"><p class="text-muted-foreground">Canvas panel - content will appear here</p></div>',
                    metadata: { title: 'Canvas' }
                });
            }
        }
    };
    
    // Extract data from promptData
    const { messages: templateMessages, variableDefaults: initialVariableDefaults, settings } = promptData;
    
    // Get model ID and config from settings
    const modelId = settings.model_id;
    const { model_id, ...modelConfig } = settings;
    
    // Extract system message and user/assistant messages
    const systemMessage = templateMessages.find(m => m.role === "system")?.content || "";
    const conversationTemplate = templateMessages.filter(m => m.role !== "system");
    
    // State for variables
    const [variableDefaults, setVariableDefaults] = useState<PromptVariable[]>(
        initialVariableDefaults || []
    );
    const [expandedVariable, setExpandedVariable] = useState<string | null>(null);
    
    // Conversation state
    const [chatInput, setChatInput] = useState("");
    const [resources, setResources] = useState<Resource[]>([]);
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
    const [lastMessageStats, setLastMessageStats] = useState<{
        timeToFirstToken?: number;
        totalTime?: number;
        tokens?: number;
    } | null>(null);
    
    // Track if conversation has started (for showing/hiding variables)
    const [conversationStarted, setConversationStarted] = useState(false);
    
    // AI Runs tracking - pass urlRunId to load existing run
    const { run, createRun, createTask, updateTask, completeTask, addMessage, isLoading: isLoadingRun } = useAiRun(urlRunId || undefined);
    const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
    const updateTaskTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [hasLoadedRun, setHasLoadedRun] = useState(false);
    
    // Ref for auto-scrolling
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    
    // Get streaming response from socket
    const streamingText = useAppSelector((state) => 
        currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ""
    );
    const isResponseEnded = useAppSelector((state) =>
        currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
    );
    
    // Load run messages when a run is loaded
    useEffect(() => {
        if (run && !hasLoadedRun && run.messages && run.messages.length > 0) {
            console.log('📥 Loading run:', run.id, 'with', run.messages.length, 'messages');
            
            // Load the messages into the conversation
            const loadedMessages = run.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                taskId: msg.taskId,
                metadata: msg.metadata,
            }));
            
            setConversationMessages(loadedMessages);
            
            // Build API conversation history (exclude system messages for API)
            const apiHistory = run.messages
                .filter(msg => msg.role !== 'system')
                .map(msg => ({
                    role: msg.role,
                    content: msg.content,
                }));
            setApiConversationHistory(apiHistory);
            
            // Load variable values from the run
            if (run.variable_values && Object.keys(run.variable_values).length > 0) {
                setVariableDefaults(prev => 
                    prev.map(v => ({
                        ...v,
                        defaultValue: run.variable_values[v.name] || v.defaultValue
                    }))
                );
            }
            
            // Mark conversation as started
            setConversationStarted(true);
            setHasLoadedRun(true);
        }
    }, [run, hasLoadedRun]);
    
    // Reset state when urlRunId changes (switching between runs)
    useEffect(() => {
        setHasLoadedRun(false);
        // Clear conversation state to prevent showing old messages
        if (urlRunId) {
            setConversationMessages([]);
            setApiConversationHistory([]);
            setConversationStarted(false);
        }
    }, [urlRunId]);
    
    // Helper function to replace variables in content
    const replaceVariables = (content: string): string => {
        let result = content;
        variableDefaults.forEach(({ name, defaultValue }) => {
            const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
            result = result.replace(regex, defaultValue);
        });
        return result;
    };
    
    // Calculate live stats during streaming
    const liveStats = useMemo(() => {
        if (!currentTaskId || !messageStartTime || !streamingText) return null;
        
        // Track time to first token
        if (timeToFirstTokenRef && !timeToFirstTokenRef.current && streamingText.length > 0) {
            timeToFirstTokenRef.current = Math.round(performance.now() - messageStartTime);
        }
        
        const currentTime = Math.round(performance.now() - messageStartTime);
        const tokenCount = Math.round(streamingText.length / 4);
        
        return {
            timeToFirstToken: timeToFirstTokenRef?.current,
            totalTime: currentTime,
            tokens: tokenCount
        };
    }, [streamingText, currentTaskId, messageStartTime]);
    
    // Build the messages to display: conversation messages + streaming message (if active)
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
    
    // Auto-scroll during streaming (less frequently to avoid janky scrolling)
    useEffect(() => {
        if (isTestingPrompt && streamingText) {
            // Only scroll if user is near the bottom already
            const container = messagesContainerRef.current;
            if (container) {
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
                if (isNearBottom) {
                    scrollToBottom('auto'); // Use 'auto' for instant scroll during streaming
                }
            }
        }
    }, [streamingText, isTestingPrompt]);
    
    // Debounced task update during streaming
    useEffect(() => {
        if (pendingTaskId && streamingText && isTestingPrompt) {
            // Clear any existing timeout
            if (updateTaskTimeoutRef.current) {
                clearTimeout(updateTaskTimeoutRef.current);
            }
            
            // Set new timeout to update after 500ms of no changes
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
            // Calculate final stats
            const totalTime = Math.round(performance.now() - messageStartTime);
            const tokenCount = Math.round(streamingText.length / 4);
            
            const finalStats = {
                timeToFirstToken: timeToFirstTokenRef.current,
                totalTime: totalTime,
                tokens: tokenCount
            };
            
            setLastMessageStats(finalStats);
            
            // Add the completed assistant message
            setConversationMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: streamingText,
                    taskId: currentTaskId,
                    metadata: finalStats
                }
            ]);

            // Add to API conversation history
            setApiConversationHistory((prev) => [
                ...prev,
                { role: "assistant", content: streamingText }
            ]);
            
            // Complete the task in AI runs system - server will calculate cost
            (async () => {
                try {
                    await completeTask(pendingTaskId, {
                        response_text: streamingText,
                        tokens_total: tokenCount,
                        time_to_first_token: timeToFirstTokenRef.current,
                        total_time: totalTime,
                        cost: 0, // Server will calculate this
                    });
                    
                    console.log('✅ Task completed:', pendingTaskId);
                } catch (err) {
                    console.error('❌ Error completing task:', err);
                }
                
                // Add assistant message to run
                if (run) {
                    try {
                        await addMessage({
                            role: 'assistant',
                            content: streamingText,
                            taskId: pendingTaskId,
                            timestamp: new Date().toISOString(),
                            metadata: {
                                ...finalStats,
                                cost: 0, // Server will calculate this
                            }
                        });
                        
                        console.log('✅ Assistant message added to run');
                    } catch (err) {
                        console.error('❌ Error adding assistant message:', err);
                    }
                } else {
                    console.warn('⚠️ No run available to add assistant message');
                }
            })();

            // Reset state
            setCurrentTaskId(null);
            setIsTestingPrompt(false);
            setMessageStartTime(null);
            setPendingTaskId(null);
            timeToFirstTokenRef.current = undefined;
        }
    }, [isResponseEnded, currentTaskId, isTestingPrompt, messageStartTime, streamingText, pendingTaskId, run, models, modelId, completeTask, addMessage]);
    
    // Handler to send message
    const handleSendTestMessage = async () => {
        if (isTestingPrompt) return;

        const isFirstMessage = apiConversationHistory.length === 0;

        let userMessageContent: string;
        let displayUserMessage: string;

        if (isFirstMessage) {
            // Mark conversation as started
            setConversationStarted(true);
            
            // First message: Use the template prompt
            const lastPromptMessage = conversationTemplate.length > 0 ? conversationTemplate[conversationTemplate.length - 1] : null;
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

        // Clear input
        setChatInput("");

        // Replace variables in the display message before showing it
        const displayMessageWithReplacedVariables = replaceVariables(displayUserMessage);

        // Add user message to conversation display
        setConversationMessages((prev) => [...prev, { role: "user", content: displayMessageWithReplacedVariables }]);

        setIsTestingPrompt(true);
        setLastMessageStats(null);
        setMessageStartTime(performance.now());
        timeToFirstTokenRef.current = undefined;

        try {
            // Create AI run on first message
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
                
                console.log('✅ Run created:', currentRun.id, '-', runName);
                
                // Update URL with the new runId
                const url = new URL(window.location.href);
                url.searchParams.set('runId', currentRun.id);
                router.replace(url.pathname + url.search);
            }
            
            let messagesToSend: PromptMessage[];

            if (isFirstMessage) {
                // First message: Use template messages, replacing the last user message if needed
                const lastPromptMessage = conversationTemplate.length > 0 ? conversationTemplate[conversationTemplate.length - 1] : null;
                const isLastMessageUser = lastPromptMessage?.role === "user";

                if (isLastMessageUser) {
                    // Replace the last template message with our combined content
                    const messagesWithoutLast = conversationTemplate.slice(0, -1);
                    messagesToSend = [...messagesWithoutLast, { role: "user", content: userMessageContent }];
                } else {
                    // Append the new user message
                    messagesToSend = [...conversationTemplate, { role: "user", content: userMessageContent }];
                }
            } else {
                // Subsequent messages: Use conversation history + new user message
                messagesToSend = [...apiConversationHistory, { role: "user", content: userMessageContent }];
            }

            // Add system message and replace variables
            const allMessages = [{ role: "system", content: systemMessage }, ...messagesToSend];
            const messagesWithVariablesReplaced = allMessages.map(msg => ({
                ...msg,
                content: replaceVariables(msg.content)
            }));

            // Add the new user message to the API conversation history
            setApiConversationHistory((prev) => [...prev, { role: "user", content: userMessageContent }]);

            // Build chat_config for direct_chat task
            const chatConfig: Record<string, any> = {
                model_id: modelId,
                messages: messagesWithVariablesReplaced,
                stream: true,
                ...modelConfig,
            };
            
            // Generate taskId for socket.io
            const taskId = uuidv4();
            
            // Create task in AI runs system BEFORE submitting to socket
            if (currentRun) {
                try {
                    await createTask({
                        task_id: taskId,
                        service: 'chat_service',
                        task_name: 'direct_chat',
                        model_id: modelId,
                        request_data: chatConfig,
                    }, currentRun.id); // Pass run ID directly
                    
                    console.log('✅ Task created:', taskId);
                    setPendingTaskId(taskId);
                    
                    // Add user message to run
                    await addMessage({
                        role: 'user',
                        content: displayMessageWithReplacedVariables,
                        timestamp: new Date().toISOString(),
                    }, currentRun.id); // Pass run ID directly
                    
                    console.log('✅ User message added to run');
                } catch (err) {
                    console.error('❌ Error creating task or adding message:', err);
                }
            } else {
                console.warn('No run available to create task');
            }

            // Submit the task using socket with the same taskId
            const result = await dispatch(createAndSubmitTask({
                service: "chat_service",
                taskName: "direct_chat",
                taskData: {
                    chat_config: chatConfig
                },
                customTaskId: taskId, // Pass our taskId to socket
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
    
    const handleVariableValueChange = (variableName: string, value: string) => {
        setVariableDefaults((prev) => 
            prev.map(v => v.name === variableName ? { ...v, defaultValue: value } : v)
        );
    };
    
    const handleClearConversation = () => {
        // Clear the runId from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('runId');
        
        // Use native browser reload to force complete remount (Next.js best practice)
        window.location.href = url.pathname + url.search;
    };
    
    // Handle run selection from sidebar
    const handleRunSelect = useCallback((runId: string) => {
        console.log('🔄 Switching to run:', runId);
        
        // Update URL with the selected runId (page will naturally reset state via URL change)
        const url = new URL(window.location.href);
        url.searchParams.set('runId', runId);
        router.push(url.pathname + url.search);
    }, [router]);
    
    return (
        <>
            {/* Minimal Header in the top nav area */}
            <PageSpecificHeader>
                <div className="flex items-center justify-between w-full h-full px-2 sm:px-4">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/ai/prompts')}
                            className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Back</span>
                        </Button>
                        <div className="h-6 w-px bg-border flex-shrink-0" />
                        <h1 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                            {promptData.name || "Untitled Prompt"}
                        </h1>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {/* Mobile sidebar toggle */}
                        {isMobile && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSidebarOnMobile(!showSidebarOnMobile)}
                                className="text-muted-foreground hover:text-foreground"
                                title={showSidebarOnMobile ? "Close runs" : "Show runs"}
                            >
                                {showSidebarOnMobile ? (
                                    <PanelLeftClose className="w-4 h-4" />
                                ) : (
                                    <PanelLeftOpen className="w-4 h-4" />
                                )}
                            </Button>
                        )}
                        {/* New Run button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearConversation}
                            className="text-muted-foreground hover:text-foreground"
                            title="Start new run"
                        >
                            <FilePlus className="w-4 h-4 sm:mr-1.5" />
                            <span className="hidden sm:inline text-xs">New</span>
                        </Button>
                        {displayMessages.length > 0 && !isMobile && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearConversation}
                                className="text-muted-foreground hover:text-foreground"
                                title="Reset conversation"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCanvasToggle}
                            className="text-muted-foreground hover:text-foreground"
                            title={isMobile && showCanvasOnMobile ? "Back to conversation" : isCanvasOpen ? "Close canvas" : "Open canvas"}
                        >
                            {isMobile && showCanvasOnMobile ? (
                                <ArrowLeft className="w-4 h-4" />
                            ) : isCanvasOpen ? (
                                <PanelRightClose className="w-4 h-4" />
                            ) : (
                                <PanelRightOpen className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </PageSpecificHeader>

            {/* Mobile Canvas Full Screen View */}
            {isMobile && showCanvasOnMobile && isCanvasOpen ? (
                <div className="h-page bg-textured overflow-hidden">
                    <CanvasRenderer content={canvasContent} />
                </div>
            ) : isMobile && showSidebarOnMobile ? (
                /* Mobile Sidebar Full Screen View */
                <div className="h-page bg-card overflow-hidden">
                    <PromptRunsSidebar
                        promptId={promptData.id}
                        promptName={promptData.name}
                        currentRunId={run?.id}
                        onRunSelect={(runId) => {
                            handleRunSelect(runId);
                            // Close sidebar on mobile after selection
                            setShowSidebarOnMobile(false);
                        }}
                    />
                </div>
            ) : (
                /* Main Layout with AdaptiveLayout */
                <AdaptiveLayout
                    className="h-page bg-textured"
                    disableAutoCanvas={isMobile} // Disable auto canvas on mobile
                    leftPanelMaxWidth={280} // Compact sidebar for runs list
                    leftPanel={
                        !isMobile ? (
                            <PromptRunsSidebar
                                promptId={promptData.id}
                                promptName={promptData.name}
                                currentRunId={run?.id}
                                onRunSelect={handleRunSelect}
                                footer={
                                    <PromptRunnerModalSidebarTester 
                                        promptData={{
                                            id: promptData.id,
                                            name: promptData.name,
                                            messages: templateMessages,
                                            variableDefaults: variableDefaults,
                                            settings: settings,
                                        }}
                                    />
                                }
                            />
                        ) : undefined
                    }
                    rightPanel={
                        <div className="h-full flex flex-col overflow-hidden">
                        {/* Messages Area - Scrollable */}
                        <div 
                            ref={messagesContainerRef}
                            className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0"
                            style={{ 
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                WebkitOverflowScrolling: 'touch',
                            }}
                        >
                            {isLoadingRun ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                                    <p className="text-lg font-medium">Loading run...</p>
                                </div>
                            ) : displayMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
                                    <MessageSquare className="w-16 h-16 mb-4" />
                                    <p className="text-lg font-medium">Ready to run your prompt</p>
                                    <p className="text-sm mt-2 text-center px-6">
                                        {variableDefaults.length > 0 
                                            ? "Fill in the variables below and send your message"
                                            : "Type your message below to get started"}
                                    </p>
                                </div>
                            ) : (
                                <div className={`space-y-6 pt-6 pb-4 ${isMobile ? 'px-3' : 'px-6'}`}>
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
                                    {/* Invisible div for auto-scrolling */}
                                    <div ref={messagesEndRef} className="h-4" />
                                </div>
                            )}
                        </div>
                        
                        {/* Input Area - Fixed at Bottom using flex-shrink */}
                        <div className={`flex-shrink-0 bg-textured ${
                            isMobile 
                                ? 'pt-4 pb-safe px-3' 
                                : 'pt-6 pb-4 px-6'
                        }`}>
                            <div className={`rounded-xl ${
                                isMobile ? 'w-full' : 'max-w-[800px] mx-auto'
                            }`}>
                                <PromptRunnerInput
                                    variableDefaults={variableDefaults}
                                    onVariableValueChange={handleVariableValueChange}
                                    expandedVariable={expandedVariable}
                                    onExpandedVariableChange={setExpandedVariable}
                                    chatInput={chatInput}
                                    onChatInputChange={setChatInput}
                                    onSendMessage={handleSendTestMessage}
                                    isTestingPrompt={isTestingPrompt}
                                    showVariables={!conversationStarted}
                                    messages={conversationTemplate}
                                    resources={resources}
                                    onResourcesChange={setResources}
                                    enablePasteImages={true}
                                />
                            </div>
                        </div>
                    </div>
                }
            />
            )}
        </>
    );
}

