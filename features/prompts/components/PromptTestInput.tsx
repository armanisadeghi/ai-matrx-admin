import React, { useState } from "react";
import { Paperclip, RefreshCw, ArrowUp, CornerDownLeft, Image, FileText, Mic, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PromptVariable } from "./PromptBuilder";
import { formatText } from "@/utils/text-case-converter";
import { FaYoutube } from "react-icons/fa";

interface PromptTestInputProps {
    variableDefaults: PromptVariable[];
    onVariableValueChange: (variableName: string, value: string) => void;
    expandedVariable: string | null;
    onExpandedVariableChange: (variable: string | null) => void;
    chatInput: string;
    onChatInputChange: (value: string) => void;
    onSendMessage: () => void;
    isTestingPrompt: boolean;
    submitOnEnter: boolean;
    onSubmitOnEnterChange: (value: boolean) => void;
    autoClear: boolean;
    onAutoClearChange: (value: boolean) => void;
    messages: Array<{ role: string; content: string }>;
    attachmentCapabilities?: {
        supportsImageUrls: boolean;
        supportsFileUrls: boolean;
        supportsYoutubeVideos: boolean;
    };
}

export function PromptTestInput({
    variableDefaults,
    onVariableValueChange,
    expandedVariable,
    onExpandedVariableChange,
    chatInput,
    onChatInputChange,
    onSendMessage,
    isTestingPrompt,
    submitOnEnter,
    onSubmitOnEnterChange,
    autoClear,
    onAutoClearChange,
    messages,
    attachmentCapabilities = { supportsImageUrls: false, supportsFileUrls: false, supportsYoutubeVideos: false },
}: PromptTestInputProps) {
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);

    // Check if the last prompt message is a user message
    const lastPromptMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isLastMessageUser = lastPromptMessage?.role === "user";
    
    // Determine if the send button should be disabled
    const isSendDisabled = isTestingPrompt || (!isLastMessageUser && !chatInput.trim());

    // Handle keyboard events in the textarea
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (submitOnEnter && e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!isSendDisabled) {
                onSendMessage();
            }
        }
    };

    return (
        <div className="bg-textured rounded-3xl border border-gray-300 dark:border-gray-700 overflow-hidden">
            {/* Variable Inputs */}
            {variableDefaults.length > 0 && (
                <div>
                    {variableDefaults.map((variable, index) => {
                        const hasLineBreaks = variable.defaultValue?.includes('\n');
                        const shouldShowPopover = hasLineBreaks || expandedVariable === variable.name;
                        
                        return (
                            <div key={variable.name} className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-300 dark:border-gray-700">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {formatText(variable.name)}
                                </span>
                                :
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
                                                className="flex-1 text-xs text-gray-900 dark:text-gray-200 truncate cursor-text rounded px-1 py-0.5 outline-none"
                                                onClick={() => onExpandedVariableChange(variable.name)}
                                                onFocus={() => onExpandedVariableChange(variable.name)}
                                                tabIndex={index + 1}
                                            >
                                                {variable.defaultValue ? (
                                                    <span className="whitespace-nowrap">
                                                        {variable.defaultValue.replace(/\n/g, " ↵ ")}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-600">Enter {formatText(variable.name)}...</span>
                                                )}
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent 
                                            className="w-[calc(30vw-6rem)] h-[400px] p-0 border-gray-300 dark:border-gray-700" 
                                            align="center"
                                            side="top"
                                            sideOffset={8}
                                        >
                                            <div className="p-3 flex flex-col h-full gap-2">
                                                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    {formatText(variable.name)}
                                                </Label>
                                                <textarea
                                                    value={variable.defaultValue || ""}
                                                    onChange={(e) => onVariableValueChange(variable.name, e.target.value)}
                                                    placeholder={`Enter ${formatText(variable.name)}...`}
                                                    autoFocus
                                                    onFocus={(e) => e.target.select()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Tab' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            // Close the popup
                                                            onExpandedVariableChange(null);
                                                            // Focus the next input in the tab order
                                                            setTimeout(() => {
                                                                const nextTabIndex = index + 2; // +2 because we want the next variable (current is index+1)
                                                                const nextElement = document.querySelector(`[tabindex="${nextTabIndex}"]`) as HTMLElement;
                                                                if (nextElement) {
                                                                    nextElement.focus();
                                                                }
                                                            }, 50);
                                                        } else if (e.key === 'Tab' && e.shiftKey) {
                                                            e.preventDefault();
                                                            // Close the popup
                                                            onExpandedVariableChange(null);
                                                            // Focus the previous input
                                                            if (index > 0) {
                                                                setTimeout(() => {
                                                                    const prevTabIndex = index;
                                                                    const prevElement = document.querySelector(`[tabindex="${prevTabIndex}"]`) as HTMLElement;
                                                                    if (prevElement) {
                                                                        prevElement.focus();
                                                                    }
                                                                }, 50);
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 w-full px-3 py-2 text-xs text-gray-900 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none scrollbar-thin"
                                                    tabIndex={-1}
                                                />
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                ) : (
                                    <div className="flex-1 flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={variable.defaultValue || ""}
                                            onChange={(e) => onVariableValueChange(variable.name, e.target.value)}
                                            placeholder={`Enter ${formatText(variable.name)}...`}
                                            className="flex-1 text-xs bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                            tabIndex={index + 1}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onExpandedVariableChange(variable.name)}
                                            className="h-5 w-5 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                                            tabIndex={-1}
                                        >
                                            <Maximize2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Text Area */}
            <div className="p-2">
                <textarea
                    value={chatInput}
                    onChange={(e) => onChatInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a message to the bottom of your prompt..."
                    className="w-full bg-transparent border-none outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none min-h-[70px] max-h-[200px] overflow-y-auto scrollbar-thin"
                    tabIndex={variableDefaults.length + 1}
                />
            </div>

            {/* Bottom Controls - All buttons in one row */}
            <div className="flex items-center justify-between px-2 pb-2">
                <Popover open={isAttachmentMenuOpen} onOpenChange={setIsAttachmentMenuOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" tabIndex={-1}>
                            <Paperclip className="w-3.5 h-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start" side="top">
                        <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
                                Add Attachment
                            </div>
                            
                            {/* Image URLs */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8 text-xs"
                                disabled={!attachmentCapabilities.supportsImageUrls}
                                onClick={() => {
                                    // TODO: Implement image URL attachment
                                    console.log("Image URL attachment clicked");
                                    setIsAttachmentMenuOpen(false);
                                }}
                            >
                                <Image className="w-4 h-4 mr-2" />
                                Image URLs
                                {!attachmentCapabilities.supportsImageUrls && (
                                    <span className="ml-auto text-xs text-gray-400">(N/A)</span>
                                )}
                            </Button>

                            {/* File URLs */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8 text-xs"
                                disabled={!attachmentCapabilities.supportsFileUrls}
                                onClick={() => {
                                    // TODO: Implement file URL attachment
                                    console.log("File URL attachment clicked");
                                    setIsAttachmentMenuOpen(false);
                                }}
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                File URLs
                                {!attachmentCapabilities.supportsFileUrls && (
                                    <span className="ml-auto text-xs text-gray-400">(N/A)</span>
                                )}
                            </Button>

                            {/* YouTube Videos */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8 text-xs"
                                disabled={!attachmentCapabilities.supportsYoutubeVideos}
                                onClick={() => {
                                    // TODO: Implement YouTube video attachment
                                    console.log("YouTube video attachment clicked");
                                    setIsAttachmentMenuOpen(false);
                                }}
                            >
                                <FaYoutube className="w-4 h-4 mr-2" />
                                YouTube Videos
                                {!attachmentCapabilities.supportsYoutubeVideos && (
                                    <span className="ml-auto text-xs text-gray-400">(N/A)</span>
                                )}
                            </Button>

                            {/* Audio Upload - Coming Soon */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8 text-xs"
                                disabled={true}
                                onClick={() => {
                                    // TODO: Implement audio upload
                                    console.log("Audio upload clicked");
                                    setIsAttachmentMenuOpen(false);
                                }}
                            >
                                <Mic className="w-4 h-4 mr-2" />
                                Audio Upload
                                <span className="ml-auto text-xs text-gray-400">(soon)</span>
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSubmitOnEnterChange(!submitOnEnter)}
                        className={`h-7 px-2 text-[11px] rounded-2xl transition-colors ${
                            submitOnEnter
                                ? "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                : "text-gray-400 dark:text-gray-600"
                        }`}
                        tabIndex={-1}
                    >
                        <CornerDownLeft className="w-3 h-3 mr-1" />
                        Submit on Enter
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAutoClearChange(!autoClear)}
                        className={`h-7 px-2 text-[11px] rounded-2xl transition-colors ${
                            autoClear
                                ? "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                : "text-gray-400 dark:text-gray-600"
                        }`}
                        tabIndex={-1}
                    >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Auto-clear
                    </Button>

                    <Button
                        onClick={onSendMessage}
                        disabled={isSendDisabled}
                        className="h-7 w-7 p-0 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600"
                        tabIndex={-1}
                    >
                        <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

