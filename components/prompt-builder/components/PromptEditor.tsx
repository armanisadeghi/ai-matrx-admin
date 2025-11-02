"use client";

import { PromptMessage } from "../../../features/prompts/hooks/usePrompts";
import { useState, useEffect, useCallback } from "react";
import { Settings, Plus, Save, ChevronUp, ChevronDown, Trash2, Variable } from "lucide-react";
import { Button } from "@/components/ui/ButtonMine";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AccordionWrapper from '@/components/matrx/matrx-collapsible/AccordionWrapper';

interface PromptEditorProps {
    onSave: (data: {
        name: string;
        messages: PromptMessage[];
        variables: string[];
        variableDefaults: Record<string, string>;
    }) => void;
    onClose?: () => void;
    initialMessages?: PromptMessage[];
    currentPrompt?: any;
    isDirty?: boolean;
}

const PromptEditor = ({ 
    onSave,
    onClose,
    initialMessages = [],
    currentPrompt = null,
    isDirty = false 
}: PromptEditorProps) => {
    const [messages, setMessages] = useState<PromptMessage[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});
    const [name, setName] = useState("");

    // Initialize messages on mount or when props change
    useEffect(() => {
        if (currentPrompt) {
            // Editing existing prompt
            setMessages(currentPrompt.messages || []);
            setDefaultValues(currentPrompt.variableDefaults || {});
            setName(currentPrompt.name || "");
        } else if (initialMessages.length > 0) {
            // Creating new with template
            setMessages(initialMessages);
            setDefaultValues({});
            setName("");
        } else {
            // Creating new from scratch
            setMessages([
                { role: "system", content: "" },
                { role: "user", content: "" },
            ]);
            setDefaultValues({});
            setName("");
        }
    }, [initialMessages, currentPrompt]);

    // Extract variables from all message contents
    const extractVariables = useCallback(() => {
        const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
        const variables = new Set<string>();

        messages.forEach((message) => {
            const matches = message.content.matchAll(variableRegex);
            for (const match of matches) {
                variables.add(match[1]);
            }
        });

        return Array.from(variables);
    }, [messages]);

    const handleMessageChange = (index, content) => {
        const updatedMessages = [...messages];
        updatedMessages[index] = { ...updatedMessages[index], content };
        setMessages(updatedMessages);
    };

    const addMessage = () => {
        setMessages([...messages, { role: "user", content: "" }]);
    };

    const removeMessage = (index) => {
        if (messages.length > 1) {
            setMessages(messages.filter((_, i) => i !== index));
        }
    };

    const toggleRole = (index) => {
        const updatedMessages = [...messages];
        const currentRole = updatedMessages[index].role;
        let newRole;
        
        // Cycle through: system -> user -> assistant -> system
        if (currentRole === "system") {
            newRole = "user";
        } else if (currentRole === "user") {
            newRole = "assistant";
        } else {
            newRole = "system";
        }
        
        // Create a new object instead of mutating the existing one
        updatedMessages[index] = { ...updatedMessages[index], role: newRole };
        setMessages(updatedMessages);
    };

    const moveMessage = (index, direction) => {
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= messages.length) return;

        const updatedMessages = [...messages];
        [updatedMessages[index], updatedMessages[newIndex]] = [updatedMessages[newIndex], updatedMessages[index]];
        setMessages(updatedMessages);
    };

    const handleSave = () => {
        const variables = extractVariables();
        onSave({
            name: name.trim() || "Untitled Prompt",
            messages,
            variables,
            variableDefaults: defaultValues,
        });
    };

    const handleDefaultValueChange = (variable, value) => {
        setDefaultValues({
            ...defaultValues,
            [variable]: value,
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape" && onClose) {
            onClose();
        }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleSave();
        }
    };

    const canSave = name.trim() || messages.some((msg) => msg.content.trim());

    return (
        <div className="flex flex-col h-full" onKeyDown={handleKeyDown} tabIndex={-1}>
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2 flex-1">
                    <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Prompt name..."
                        className="text-xs font-medium flex-1 h-6 max-w-md py-0 px-1 border-none shadow-none focus-visible:ring-0"
                    />
                    {isDirty && <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">• Unsaved changes</span>}
                </div>
                <div className="flex items-center gap-2 pr-6">
                    <Button
                        onClick={addMessage}
                        variant="ghost"
                        size="xs"
                        title="Add message"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Message
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!canSave}
                        size="xs"
                        className="flex items-center gap-1"
                    >
                        <Save className="w-3 h-3" />
                        Save Prompt
                    </Button>
                    <Button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        variant="ghost"
                        size="xs"
                        title="Configure variables"
                    >
                        <Variable className="w-4 h-4 mr-1" />
                        Variables
                    </Button>
                </div>
            </div>

            {/* Content with sidebar */}
            <div className="flex-1 flex min-h-0">
                {/* Main content */}
                <div className={`flex-1 flex flex-col min-h-0 ${sidebarOpen ? "mr-2" : ""}`}>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-3 max-w-none">
                            {messages.map((message, index) => (
                                <AccordionWrapper
                                    key={index}
                                    title={`${message.role.toUpperCase()}`}
                                    value={`message-${index}`}
                                    defaultOpen={true}
                                    className="border border-zinc-300 dark:border-zinc-700 rounded-lg"
                                    rightElement={
                                        <div className="flex items-center gap-1">
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleRole(index);
                                                }}
                                                variant="ghost"
                                                size="xs"
                                                className="h-7 px-2 text-xs"
                                                title="Toggle role"
                                            >
                                                <Settings className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveMessage(index, "up");
                                                }}
                                                disabled={index === 0}
                                                variant="ghost"
                                                size="xs"
                                                className="h-7 w-7 p-0"
                                                title="Move up"
                                            >
                                                <ChevronUp className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveMessage(index, "down");
                                                }}
                                                disabled={index === messages.length - 1}
                                                variant="ghost"
                                                size="xs"
                                                className="h-7 w-7 p-0"
                                                title="Move down"
                                            >
                                                <ChevronDown className="w-3 h-3" />
                                            </Button>
                                            {messages.length > 1 && (
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeMessage(index);
                                                    }}
                                                    variant="ghost"
                                                    size="xs"
                                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                                    title="Remove message"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    }
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                message.role === "system"
                                                    ? "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                                                    : message.role === "user"
                                                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                                    : "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                                            }`}>
                                                {message.role}
                                            </span>
                                            <Button
                                                onClick={() => toggleRole(index)}
                                                variant="outline"
                                                size="xs"
                                                className="h-7 px-2 text-xs"
                                                title="Click to change role"
                                            >
                                                Change Role
                                            </Button>
                                        </div>
                                        <Textarea
                                            value={message.content}
                                            onChange={(e) => handleMessageChange(index, e.target.value)}
                                            placeholder={`Enter ${message.role} message... Use {{variable}} for variables`}
                                            className="w-full bg-inherit p-3 text-sm resize-y border border-zinc-300 dark:border-zinc-600 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-md min-h-[200px]"
                                            rows={8}
                                        />
                                    </div>
                                </AccordionWrapper>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                {sidebarOpen && (
                    <div className="w-80 border-l border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex flex-col">
                        <div className="p-4 border-b border-zinc-300 dark:border-zinc-700">
                            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Variable Defaults</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="space-y-4">
                                {extractVariables().length === 0 ? (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        No variables detected. Use {"{variable}"} syntax in your messages.
                                    </p>
                                ) : (
                                    extractVariables().map((variable) => (
                                        <div key={variable} className="space-y-2">
                                            <Label className="text-xs font-medium">{variable}</Label>
                                            <Textarea
                                                value={defaultValues[variable] || ""}
                                                onChange={(e) => handleDefaultValueChange(variable, e.target.value)}
                                                placeholder={`Default value for ${variable}`}
                                                className="w-full bg-background text-xs resize-y min-h-[100px]"
                                                rows={4}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Variables preview */}
            {extractVariables().length > 0 && (
                <div className="flex-shrink-0 px-4 py-3 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">Variables detected:</div>
                    <div className="flex flex-wrap gap-2">
                        {extractVariables().map((variable) => (
                            <span
                                key={variable}
                                className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded text-xs font-mono"
                            >
                                {variable}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                Use <code className="bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-1 rounded">{"{variable}"}</code>{" "}
                syntax for variables •
                <kbd className="ml-1 px-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded">Cmd+Enter</kbd> to save
                {onClose && (
                    <>
                        • <kbd className="ml-1 px-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded">Esc</kbd> to close
                    </>
                )}
            </div>
        </div>
    );
};

export default PromptEditor; 