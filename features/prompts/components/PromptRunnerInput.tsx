import React from "react";
import { ArrowUp, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PromptVariable } from "./PromptBuilder";
import { formatText } from "@/utils/text/text-case-converter";

interface PromptRunnerInputProps {
    variableDefaults: PromptVariable[];
    onVariableValueChange: (variableName: string, value: string) => void;
    expandedVariable: string | null;
    onExpandedVariableChange: (variable: string | null) => void;
    chatInput: string;
    onChatInputChange: (value: string) => void;
    onSendMessage: () => void;
    isTestingPrompt: boolean;
    showVariables: boolean; // Controls whether variables are visible
    messages: Array<{ role: string; content: string }>;
}

export function PromptRunnerInput({
    variableDefaults,
    onVariableValueChange,
    expandedVariable,
    onExpandedVariableChange,
    chatInput,
    onChatInputChange,
    onSendMessage,
    isTestingPrompt,
    showVariables,
    messages,
}: PromptRunnerInputProps) {
    
    // Check if the last prompt message is a user message
    const lastPromptMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isLastMessageUser = lastPromptMessage?.role === "user";
    
    // Determine if the send button should be disabled
    const isSendDisabled = isTestingPrompt || (!isLastMessageUser && !chatInput.trim());

    // Handle keyboard events in the textarea
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!isSendDisabled) {
                onSendMessage();
            }
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden">
            {/* Variable Inputs - Only shown when showVariables is true */}
            {showVariables && variableDefaults.length > 0 && (
                <div className="border-b border-gray-200 dark:border-gray-800">
                    <div className="px-3 py-2">
                        <div className="space-y-2">
                            {variableDefaults.map((variable, index) => {
                                const hasLineBreaks = variable.defaultValue?.includes('\n');
                                const shouldShowPopover = hasLineBreaks || expandedVariable === variable.name;
                                
                                return (
                                    <div key={variable.name} className="space-y-1">
                                        <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                            {formatText(variable.name)}
                                        </Label>
                                        {shouldShowPopover ? (
                                            <Popover
                                                open={expandedVariable === variable.name}
                                                onOpenChange={(open) => {
                                                    if (!open) {
                                                        onExpandedVariableChange(null);
                                                    }
                                                }}
                                            >
                                                <PopoverTrigger asChild>
                                                    <div
                                                        className="w-full px-2 py-1.5 text-sm text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-gray-600 rounded-md cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                                        onClick={() => onExpandedVariableChange(variable.name)}
                                                        onFocus={() => onExpandedVariableChange(variable.name)}
                                                        tabIndex={index + 1}
                                                    >
                                                        {variable.defaultValue ? (
                                                            <span className="whitespace-nowrap overflow-hidden text-ellipsis block">
                                                                {variable.defaultValue.replace(/\n/g, " ↵ ")}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-600">
                                                                Enter {formatText(variable.name).toLowerCase()}...
                                                            </span>
                                                        )}
                                                    </div>
                                                </PopoverTrigger>
                                                <PopoverContent 
                                                    className="w-[500px] h-[400px] p-0 border-gray-300 dark:border-gray-700" 
                                                    align="center"
                                                    side="top"
                                                    sideOffset={8}
                                                >
                                                    <div className="p-4 flex flex-col h-full gap-3">
                                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            {formatText(variable.name)}
                                                        </Label>
                                                        <textarea
                                                            value={variable.defaultValue || ""}
                                                            onChange={(e) => onVariableValueChange(variable.name, e.target.value)}
                                                            placeholder={`Enter ${formatText(variable.name).toLowerCase()}...`}
                                                            autoFocus
                                                            onFocus={(e) => e.target.select()}
                                                            className="flex-1 w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 scrollbar-thin"
                                                            tabIndex={-1}
                                                        />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="text"
                                                    value={variable.defaultValue || ""}
                                                    onChange={(e) => onVariableValueChange(variable.name, e.target.value)}
                                                    placeholder={`Enter ${formatText(variable.name).toLowerCase()}...`}
                                                    className="flex-1 px-2 py-1.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                                    tabIndex={index + 1}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onExpandedVariableChange(variable.name)}
                                                    className="h-7 w-7 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                                                    tabIndex={-1}
                                                    title="Expand to full editor"
                                                >
                                                    <Maximize2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Text Area */}
            <div className="px-3 py-2">
                <textarea
                    value={chatInput}
                    onChange={(e) => onChatInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={showVariables ? "Add optional message..." : "Type your message..."}
                    className="w-full bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none min-h-[60px] max-h-[300px] overflow-y-auto scrollbar-thin"
                    tabIndex={variableDefaults.length + 1}
                    autoFocus={!showVariables || variableDefaults.length === 0}
                />
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between px-3 pb-2">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    Shift+Enter for new line
                </div>
                <Button
                    onClick={onSendMessage}
                    disabled={isSendDisabled}
                    className="h-9 w-9 p-0 flex-shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-600 text-white"
                    tabIndex={-1}
                >
                    {isTestingPrompt ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <ArrowUp className="w-4 h-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}

