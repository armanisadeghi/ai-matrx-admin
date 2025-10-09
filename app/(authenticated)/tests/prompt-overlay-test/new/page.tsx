"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Settings2,
    Plus,
    Save,
    X,
    ChevronUp,
    ChevronDown,
    Trash2,
    Sparkles,
    BarChart,
    GitCompare,
    FileText,
    MessageSquare,
    Edit2,
    Paperclip,
    RefreshCw,
    ArrowUp,
    Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePromptsWithFetch, PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { useRouter } from "next/navigation";
import ModelSettingsDialog from "@/components/prompt-builder/components/ModelSettingsDialog";

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

// Helper component to render text with highlighted variables
const HighlightedText = ({ text }: { text: string }) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g);

    return (
        <>
            {parts.map((part, idx) => {
                if (part.match(/\{\{[^}]+\}\}/)) {
                    return (
                        <span
                            key={idx}
                            className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md px-1 py-0.5 font-medium"
                        >
                            {part}
                        </span>
                    );
                }
                return <span key={idx}>{part}</span>;
            })}
        </>
    );
};

// We'll use the built-in Select component now

export default function NewPromptPage() {
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
    const [conversationMessages, setConversationMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [autoClear, setAutoClear] = useState(false);
    const [isTestingPrompt, setIsTestingPrompt] = useState(false);

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
                variableDefaults: variableDefaults as any,
            });

            setIsDirty(false);
            router.push("/ai/prompts");
        } catch (error) {
            console.error("Error saving prompt:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Test chat handler
    const handleSendTestMessage = async () => {
        if (!chatInput.trim() || isTestingPrompt) return;

        const userMessage = chatInput;
        if (autoClear) {
            setChatInput("");
        }

        // Add user message
        setConversationMessages((prev) => [...prev, { role: "user", content: userMessage }]);

        setIsTestingPrompt(true);

        try {
            // Prepare messages with developer message and prompt messages
            const allMessages = [{ role: "system", content: developerMessage }, ...messages, { role: "user", content: userMessage }];

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
                                assistantMessage += data.content;
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
        } catch (error) {
            console.error("Error testing prompt:", error);
            setConversationMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to get response from AI" }]);
        } finally {
            setIsTestingPrompt(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={promptName}
                            onChange={(e) => {
                                setPromptName(e.target.value);
                                setIsDirty(true);
                            }}
                            className="text-lg font-semibold bg-transparent border-none outline-none w-64 text-gray-900 dark:text-gray-100 px-0 py-1"
                        />
                        <span className="px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            Draft
                        </span>
                        {isDirty && (
                            <span className="px-2 py-0.5 text-xs border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 rounded">
                                Unsaved changes
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                            <GitCompare className="w-4 h-4 mr-2" />
                            Compare
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Optimize
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                            <BarChart className="w-4 h-4 mr-2" />
                            Evaluate
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !isDirty}
                            className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Configuration */}
                <div className="w-1/2 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
                    <div className="flex-1 overflow-y-auto pl-2 pr-1 space-y-3" style={{ scrollbarGutter: "stable" }}>
                        {/* Model Configuration */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-3">
                                    <Label className="text-xs text-gray-600 dark:text-gray-400">Model</Label>
                                    <Select value={model} onValueChange={setModel}>
                                        <SelectTrigger className="h-8 bg-transparent text-gray-700 dark:text-gray-500 border-none hover:bg-gray-200 dark:hover:bg-gray-700 w-auto min-w-[180px] text-xs focus-none">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                                            <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                                            <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                                            <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                                            <SelectItem value="claude-3-5-sonnet-20241022">claude-3.5-sonnet</SelectItem>
                                            <SelectItem value="claude-3-opus-20240229">claude-3-opus</SelectItem>
                                            <SelectItem value="claude-3-haiku-20240307">claude-3-haiku</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    onClick={() => setIsSettingsOpen(true)}
                                >
                                    <Settings2 className="w-3.5 h-3.5 mr-1" />
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-1.5 text-xs">
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                                    text_format: <span className="text-green-600 dark:text-green-400">{modelConfig.textFormat}</span>
                                </span>
                                {modelConfig.temperature !== undefined && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                                        temp:{" "}
                                        <span className="text-green-600 dark:text-green-400">{modelConfig.temperature.toFixed(2)}</span>
                                    </span>
                                )}
                                {modelConfig.maxTokens !== undefined && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                                        tokens: <span className="text-green-600 dark:text-green-400">{modelConfig.maxTokens}</span>
                                    </span>
                                )}
                                {modelConfig.topP !== undefined && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                                        top_p: <span className="text-green-600 dark:text-green-400">{modelConfig.topP.toFixed(2)}</span>
                                    </span>
                                )}
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                                    store: <span className="text-green-600 dark:text-green-400">{modelConfig.storeLogs.toString()}</span>
                                </span>
                            </div>
                        </div>

                        {/* Variables */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Label className="text-xs text-gray-600 dark:text-gray-400">Variables</Label>
                            {variables.map((variable) => (
                                <span
                                    key={variable}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-700"
                                >
                                    {variable}
                                    <X
                                        className="w-3 h-3 cursor-pointer hover:text-red-500 dark:hover:text-red-400"
                                        onClick={() => handleRemoveVariable(variable)}
                                    />
                                </span>
                            ))}
                            <Popover open={isAddingVariable} onOpenChange={setIsAddingVariable}>
                                <PopoverTrigger asChild>
                                    <button
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                        onClick={() => setIsAddingVariable(true)}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3" align="start">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-600 dark:text-gray-400">Variable name</Label>
                                        <input
                                            type="text"
                                            placeholder="e.g. city"
                                            value={newVariableName}
                                            onChange={(e) => setNewVariableName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleAddVariable();
                                                } else if (e.key === "Escape") {
                                                    setIsAddingVariable(false);
                                                    setNewVariableName("");
                                                }
                                            }}
                                            autoFocus
                                            className="w-full px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Only lowercase letters, numbers, and underscores
                                        </p>
                                        <Button size="sm" onClick={handleAddVariable} className="w-full">
                                            Add
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Tools */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Label className="text-xs text-gray-600 dark:text-gray-400">Tools</Label>
                            {selectedTools.map((tool) => (
                                <span
                                    key={tool}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs font-medium border border-green-200 dark:border-green-800"
                                >
                                    {tool}
                                    <X
                                        className="w-3 h-3 cursor-pointer hover:text-red-500 dark:hover:text-red-400"
                                        onClick={() => handleRemoveTool(tool)}
                                    />
                                </span>
                            ))}
                            <Popover open={isAddingTool} onOpenChange={setIsAddingTool}>
                                <PopoverTrigger asChild>
                                    <button
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                        onClick={() => setIsAddingTool(true)}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3" align="start">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Select a tool</Label>
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {availableTools
                                                .filter((tool) => !selectedTools.includes(tool))
                                                .map((tool) => (
                                                    <button
                                                        key={tool}
                                                        onClick={() => handleAddTool(tool)}
                                                        className="w-full text-left px-3 py-2 text-xs text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    >
                                                        {tool}
                                                    </button>
                                                ))}
                                        </div>
                                        {availableTools.filter((tool) => !selectedTools.includes(tool)).length === 0 && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                                                All tools have been added
                                            </p>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* System Message */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-gray-600 dark:text-gray-400">System</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    onClick={() => setDeveloperMessage("")}
                                >
                                    Clear
                                </Button>
                            </div>
                            <div className="relative">
                                <textarea
                                    value={developerMessage}
                                    onChange={(e) => {
                                        setDeveloperMessage(e.target.value);
                                        setIsDirty(true);
                                        // Auto-resize textarea
                                        e.target.style.height = "auto";
                                        e.target.style.height = e.target.scrollHeight + "px";
                                    }}
                                    onFocus={(e) => {
                                        // Set initial height on focus
                                        e.target.style.height = "auto";
                                        e.target.style.height = e.target.scrollHeight + "px";
                                    }}
                                    placeholder="You're a very helpful assistant"
                                    className="w-full min-h-[240px] bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-3 resize-none overflow-hidden"
                                />
                            </div>
                        </div>

                        {/* Prompt Messages */}
                        <div className="space-y-2">
                            <Label className="text-xs text-gray-600 dark:text-gray-400">Prompt messages</Label>
                            <div className="space-y-2">
                                {messages.map((message, index) => {
                                    const isEditing = editingMessageIndex === index;

                                    return (
                                        <div
                                            key={index}
                                            className="group border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                                        >
                                            {/* Header */}
                                            <div className="flex items-center justify-between px-2 py-1">
                                                <Select
                                                    value={message.role}
                                                    onValueChange={(role) => {
                                                        const updated = [...messages];
                                                        updated[index] = { ...updated[index], role };
                                                        setMessages(updated);
                                                        setIsDirty(true);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 bg-transparent text-gray-800 dark:text-gray-200 border-none hover:bg-gray-200 dark:hover:bg-gray-700 w-auto min-w-[180px] text-xs focus-none [&>svg]:opacity-0 [&>svg]:group-hover:opacity-100 [&>svg]:transition-opacity">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">User</SelectItem>
                                                        <SelectItem value="assistant">Assistant</SelectItem>
                                                        <SelectItem value="system">System</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                                    <Popover
                                                        open={variablePopoverOpen === index}
                                                        onOpenChange={(open) => {
                                                            setVariablePopoverOpen(open ? index : null);
                                                        }}
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-300 dark:hover:text-gray-300"
                                                                onClick={() => {
                                                                    // Ensure message is in edit mode
                                                                    if (!isEditing) {
                                                                        setEditingMessageIndex(index);
                                                                    }
                                                                }}
                                                            >
                                                                <Plus className="w-3 h-3 mr-1" />
                                                                Variable
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-56 p-2" align="start">
                                                            <div className="space-y-1">
                                                                    {variables.length === 0 ? (
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-2 italic">
                                                                        No variables defined
                                                                    </div>
                                                                ) : (
                                                                    variables.map((variable) => (
                                                                        <Button
                                                                            key={variable}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="w-full justify-start h-8 px-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                            onClick={() => {
                                                                                insertVariableIntoMessage(index, variable);
                                                                                setVariablePopoverOpen(null);
                                                                            }}
                                                                        >
                                                                            <span className="font-mono">{variable}</span>
                                                                        </Button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-300"
                                                        onClick={() => setEditingMessageIndex(isEditing ? null : index)}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-400"
                                                        onClick={() => deleteMessage(index)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-4">
                                                {isEditing ? (
                                                    <textarea
                                                        ref={(el) => {
                                                            textareaRefs.current[index] = el;
                                                        }}
                                                        value={message.content}
                                                        onChange={(e) => {
                                                            updateMessage(index, e.target.value);
                                                            // Auto-resize textarea
                                                            e.target.style.height = "auto";
                                                            e.target.style.height = e.target.scrollHeight + "px";
                                                        }}
                                                        onSelect={(e) => {
                                                            // Track cursor position
                                                            const target = e.target as HTMLTextAreaElement;
                                                            setCursorPositions({
                                                                ...cursorPositions,
                                                                [index]: target.selectionStart,
                                                            });
                                                        }}
                                                        onFocus={(e) => {
                                                            // Set initial height on focus
                                                            e.target.style.height = "auto";
                                                            e.target.style.height = e.target.scrollHeight + "px";
                                                            // Move cursor to end
                                                            const length = e.target.value.length;
                                                            e.target.setSelectionRange(length, length);
                                                            // Track cursor position
                                                            setCursorPositions({
                                                                ...cursorPositions,
                                                                [index]: length,
                                                            });
                                                        }}
                                                        placeholder={
                                                            message.role === "assistant"
                                                                ? "Enter assistant message..."
                                                                : "Message content..."
                                                        }
                                                        className="w-full bg-gray-50 dark:bg-gray-800 border-none outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-0 resize-none overflow-hidden"
                                                        autoFocus
                                                        onBlur={() => setEditingMessageIndex(null)}
                                                        style={{
                                                            minHeight: "80px",
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="text-xs text-gray-900 dark:text-gray-200 whitespace-pre-wrap cursor-text min-h-[80px]"
                                                        onClick={() => setEditingMessageIndex(index)}
                                                    >
                                                        {message.content ? (
                                                            <HighlightedText text={message.content} />
                                                        ) : (
                                                            <span className="text-gray-500 dark:text-gray-500 italic">
                                                                {message.role === "assistant"
                                                                    ? "Enter assistant message..."
                                                                    : "Enter message..."}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Fixed Add Message Button at Bottom */}
                    <div className="p-6 pt-3 border-t border-gray-200 dark:border-gray-800">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={addMessage}
                            className="w-full text-gray-400 hover:text-gray-300 border border-dashed border-gray-600 hover:border-gray-500"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add message
                        </Button>
                    </div>
                </div>

                {/* Right Panel - Preview & Testing */}
                <div className="w-1/2 flex flex-col bg-gray-50 dark:bg-gray-900">
                    {/* Conversation Preview */}
                    <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarGutter: "stable" }}>
                        {conversationMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
                                <MessageSquare className="w-12 h-12 mb-3" />
                                <p className="text-xs">Your conversation will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {conversationMessages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-4 rounded-lg ${
                                            msg.role === "user"
                                                ? "bg-blue-100 dark:bg-blue-900/30 ml-12"
                                                : "bg-gray-200 dark:bg-gray-800 mr-12"
                                        }`}
                                    >
                                        <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                                            {msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}
                                        </div>
                                        <div className="text-xs text-gray-900 dark:text-gray-100">{msg.content}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Test Input Area */}
                    <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-900 dark:bg-gray-900 space-y-3">
                        {/* Clear conversation button */}
                        {conversationMessages.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConversationMessages([])}
                                className="text-gray-400 dark:text-gray-400 hover:text-gray-300"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear conversation
                            </Button>
                        )}

                        {/* Unified Chat Container with Variables and Input */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
                            {/* Variable Inputs */}
                            {variables.length > 0 && (
                                <div>
                                    {variables.map((variable) => (
                                        <div
                                            key={variable}
                                            className="flex items-center gap-2 px-1 py-1.5 border-b border-gray-300 dark:border-gray-700"
                                        >
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                {variable}
                                            </span>
                                            :
                                            <div
                                                className="flex-1 text-xs text-gray-900 dark:text-gray-200 truncate cursor-text"
                                                onClick={() => setExpandedVariable(variable)}
                                            >
                                                {testVariables[variable] ? (
                                                    <span className="whitespace-nowrap">
                                                        {testVariables[variable].replace(/\n/g, " ↵ ")}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-600">Enter {variable}...</span>
                                                )}
                                            </div>
                                            <Popover
                                                open={expandedVariable === variable}
                                                onOpenChange={(open) => !open && setExpandedVariable(null)}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                                        onClick={() => setExpandedVariable(variable)}
                                                    >
                                                        <Maximize2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-96" align="end">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                            {variable}
                                                        </Label>
                                                        <textarea
                                                            value={testVariables[variable] || ""}
                                                            onChange={(e) =>
                                                                setTestVariables({ ...testVariables, [variable]: e.target.value })
                                                            }
                                                            placeholder={`Enter ${variable}...`}
                                                            autoFocus
                                                            onFocus={(e) => e.target.select()}
                                                            rows={8}
                                                            className="w-full px-3 py-2 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none"
                                                        />
                                                        <div className="flex justify-end">
                                                            <Button size="sm" onClick={() => setExpandedVariable(null)}>
                                                                Done
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Text Area with inline submit button */}
                            <div className="flex items-end gap-2 p-1">
                                <textarea
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Add a message to the bottom of your prompt..."
                                    className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none min-h-[70px] max-h-[200px] overflow-y-auto scrollbar-thin"
                                />
                                <Button
                                    onClick={handleSendTestMessage}
                                    disabled={isTestingPrompt || !chatInput.trim()}
                                    className="h-8 w-8 p-0 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600"
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Bottom Controls */}
                            <div className="flex items-center justify-between px-3 py-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-300">
                                    <Paperclip className="w-4 h-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAutoClear(!autoClear)}
                                    className={`h-8 px-3 text-xs ${
                                        autoClear
                                            ? "text-gray-200 dark:text-gray-200"
                                            : "text-gray-400 dark:text-gray-400 hover:text-gray-300"
                                    }`}
                                >
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                    Auto-clear
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
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
