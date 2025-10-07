"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePromptsWithFetch, PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { useRouter } from "next/navigation";
import ModelSettingsDialog from "@/components/prompt-builder/components/ModelSettingsDialog";
import { PromptBuilderHeader } from "./PromptBuilderHeader";
import { PromptBuilderRightPanel } from "./PromptBuilderRightPanel";
import { PromptBuilderLeftPanel } from "./PromptBuilderLeftPanel";

type MessageRole = "system" | "user" | "assistant";

interface ModelConfig {
    textFormat: string;
    toolChoice: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    storeLogs: boolean;
    reasoningEffort?: string;
    verbosity?: string;
    summary?: string;
}

export function PromptBuilder() {
    const router = useRouter();
    const { createPrompt } = usePromptsWithFetch();

    // Core state
    const [promptName, setPromptName] = useState("New prompt");
    const [model, setModel] = useState("gpt-4o");
    const [modelConfig, setModelConfig] = useState<ModelConfig>({
        textFormat: "text",
        toolChoice: "auto",
        temperature: 1.0,
        maxTokens: 2048,
        topP: 1.0,
        storeLogs: true,
        reasoningEffort: "medium",
        verbosity: "medium",
        summary: "auto",
    });
    const [developerMessage, setDeveloperMessage] = useState("You're a very helpful assistant");
    const [messages, setMessages] = useState<PromptMessage[]>([
        { role: "user", content: "Do you know about {{city}}?\n\nI'm looking for {{what}} there.\n\nCan you help me?" },
    ]);

    // Variables state
    const [variables, setVariables] = useState<string[]>(["city", "what"]);
    const [newVariableName, setNewVariableName] = useState("");
    const [isAddingVariable, setIsAddingVariable] = useState(false);
    const [expandedVariable, setExpandedVariable] = useState<string | null>(null);

    // Tools state
    const [selectedTools, setSelectedTools] = useState<string[]>([]);
    const [isAddingTool, setIsAddingTool] = useState(false);

    const availableTools = ["web_search", "web_page_read", "get_news", "get_weather", "run_python_code", "make_html_page"];

    // Testing state
    const [testVariables, setTestVariables] = useState<Record<string, string>>({
        city: "New York",
        what: "Hotels",
    });
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
    const [autoClear, setAutoClear] = useState(true);
    const [isTestingPrompt, setIsTestingPrompt] = useState(false);
    const [lastMessageStats, setLastMessageStats] = useState<{
        timeToFirstToken?: number;
        totalTime?: number;
        tokens?: number;
    } | null>(null);

    // UI state
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showModelConfig, setShowModelConfig] = useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [variablePopoverOpen, setVariablePopoverOpen] = useState<number | null>(null);
    const [cursorPositions, setCursorPositions] = useState<Record<number, number>>({});
    
    // Refs for textarea elements
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

    // Handler to add a tool
    const handleAddTool = (tool: string) => {
        if (!selectedTools.includes(tool)) {
            setSelectedTools((prev) => [...prev, tool]);
            setIsDirty(true);
        }
        setIsAddingTool(false);
    };

    // Handler to remove a tool
    const handleRemoveTool = (tool: string) => {
        setSelectedTools((prev) => prev.filter((t) => t !== tool));
        setIsDirty(true);
    };

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

    const deleteMessage = (index: number) => {
        setMessages(messages.filter((_, i) => i !== index));
        setIsDirty(true);
    };

    const insertVariableIntoMessage = (messageIndex: number, variable: string) => {
        const textarea = textareaRefs.current[messageIndex];
        if (!textarea) {
            // Fallback: just append to the end
            const updated = [...messages];
            updated[messageIndex] = {
                ...updated[messageIndex],
                content: updated[messageIndex].content + `{{${variable}}}`,
            };
            setMessages(updated);
            setIsDirty(true);
            return;
        }

        const cursorPos = cursorPositions[messageIndex] ?? textarea.value.length;
        const currentContent = messages[messageIndex].content;
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
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            // Auto-resize
            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";
        }, 0);
    };

    const moveMessage = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === messages.length - 1) return;

        const updated = [...messages];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
        setMessages(updated);
        setIsDirty(true);
    };

    // Save handler
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const allMessages: PromptMessage[] = [{ role: "system", content: developerMessage }, ...messages];

            const variableDefaults: Record<string, string> = {};
            variables.forEach((v) => {
                variableDefaults[v] = testVariables[v] || "";
            });

            await createPrompt({
                name: promptName,
                messages: allMessages,
                variableDefaults,
            });

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

    // Test chat handler
    const handleSendTestMessage = async () => {
        if (isTestingPrompt) return;

        // Check if the last message in the prompt is a user message
        const lastPromptMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const isLastMessageUser = lastPromptMessage?.role === "user";

        // If last message is not a user message, we need chat input
        if (!isLastMessageUser && !chatInput.trim()) return;

        // Prepare the messages based on whether last prompt message is a user message
        let finalMessages: PromptMessage[];
        let displayUserMessage: string;

        if (isLastMessageUser) {
            // Combine the last user message with chatInput (if any)
            const lastMessageContent = lastPromptMessage.content;
            const additionalInput = chatInput.trim();
            
            // Create the combined message with a line break if there's additional input
            const combinedContent = additionalInput 
                ? `${lastMessageContent}\n${additionalInput}`
                : lastMessageContent;
            
            displayUserMessage = combinedContent;
            
            // Replace the last message with the combined version
            const messagesWithoutLast = messages.slice(0, -1);
            finalMessages = [...messagesWithoutLast, { role: "user", content: combinedContent }];
        } else {
            // Normal behavior: add chatInput as a new user message
            displayUserMessage = chatInput;
            finalMessages = [...messages, { role: "user", content: chatInput }];
        }

        if (autoClear) {
            setChatInput("");
        }

        // Replace variables in the display message before showing it
        const displayMessageWithReplacedVariables = replaceVariables(displayUserMessage);

        // Add user message to conversation (display the combined/final message with variables replaced)
        setConversationMessages((prev) => [...prev, { role: "user", content: displayMessageWithReplacedVariables }]);

        setIsTestingPrompt(true);
        setLastMessageStats(null); // Clear previous stats
        
        // Track timing
        const startTime = performance.now();
        let timeToFirstToken: number | undefined;
        let tokenCount = 0;

        try {
            // Prepare messages with developer message and final messages
            const allMessages = [{ role: "system", content: developerMessage }, ...finalMessages];

            // Call API
            const response = await fetch("/api/prompts/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: allMessages,
                    model,
                    variables: testVariables,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get AI response");
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) throw new Error("No reader available");

            let assistantMessage = "";
            setConversationMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = new TextDecoder().decode(value);
                const lines = text.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.content) {
                                // Track time to first token
                                if (timeToFirstToken === undefined && data.content) {
                                    timeToFirstToken = Math.round(performance.now() - startTime);
                                }
                                
                                assistantMessage += data.content;
                                // Rough token estimation: ~4 chars = 1 token
                                tokenCount = Math.round(assistantMessage.length / 4);
                                
                                // Update stats in real-time
                                const currentTime = Math.round(performance.now() - startTime);
                                setLastMessageStats({
                                    timeToFirstToken,
                                    totalTime: currentTime,
                                    tokens: tokenCount
                                });
                                
                                setConversationMessages((prev) => {
                                    const updated = [...prev];
                                    updated[updated.length - 1] = {
                                        role: "assistant",
                                        content: assistantMessage,
                                    };
                                    return updated;
                                });
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }
            
            // Calculate total time and save stats
            const totalTime = Math.round(performance.now() - startTime);
            const stats = {
                timeToFirstToken,
                totalTime,
                tokens: tokenCount
            };
            
            setLastMessageStats(stats);
            
            // Update the last message with metadata
            setConversationMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    metadata: stats
                };
                return updated;
            });
        } catch (error) {
            console.error("Error testing prompt:", error);
            setConversationMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to get response from AI" }]);
        } finally {
            setIsTestingPrompt(false);
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
            />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Configuration */}
                <PromptBuilderLeftPanel
                    model={model}
                    onModelChange={(value) => {
                        setModel(value);
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
                    selectedTools={selectedTools}
                    availableTools={availableTools}
                    isAddingTool={isAddingTool}
                    onIsAddingToolChange={setIsAddingTool}
                    onAddTool={handleAddTool}
                    onRemoveTool={handleRemoveTool}
                    developerMessage={developerMessage}
                    onDeveloperMessageChange={(value) => {
                        setDeveloperMessage(value);
                        setIsDirty(true);
                        // Auto-resize will be handled in the component
                    }}
                    onDeveloperMessageClear={() => setDeveloperMessage("")}
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
                    onDeleteMessage={deleteMessage}
                    onInsertVariable={insertVariableIntoMessage}
                    onAddMessage={addMessage}
                    textareaRefs={textareaRefs}
                    cursorPositions={cursorPositions}
                    onCursorPositionChange={setCursorPositions}
                />

                {/* Right Panel - Preview & Testing */}
                <PromptBuilderRightPanel
                    conversationMessages={conversationMessages}
                    onClearConversation={() => {
                        setConversationMessages([]);
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
                    messages={messages}
                    isStreamingMessage={isTestingPrompt}
                    lastMessageStats={lastMessageStats}
                />
            </div>

            {/* Model Settings Dialog */}
            <ModelSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                model={model}
                settings={modelConfig}
                onSettingsChange={setModelConfig}
            />
        </div>
    );
}

