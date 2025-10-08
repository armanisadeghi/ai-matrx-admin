import React, { useState } from "react";
import { MessageSquare, Trash2, Paperclip, RefreshCw, ArrowUp, Maximize2, CornerDownLeft, Image, FileText, Youtube, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EnhancedChatMarkdown from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";
import { PromptErrorMessage } from "./PromptErrorMessage";
import { PromptStats } from "./PromptStats";

interface PromptBuilderRightPanelProps {
    conversationMessages: Array<{ 
        role: string; 
        content: string;
        metadata?: {
            timeToFirstToken?: number;
            totalTime?: number;
            tokens?: number;
        }
    }>;
    onClearConversation: () => void;
    variables: string[];
    testVariables: Record<string, string>;
    onTestVariableChange: (variable: string, value: string) => void;
    expandedVariable: string | null;
    onExpandedVariableChange: (variable: string | null) => void;
    chatInput: string;
    onChatInputChange: (value: string) => void;
    onSendMessage: () => void;
    isTestingPrompt: boolean;
    autoClear: boolean;
    onAutoClearChange: (value: boolean) => void;
    submitOnEnter: boolean;
    onSubmitOnEnterChange: (value: boolean) => void;
    messages: Array<{ role: string; content: string }>;
    isStreamingMessage?: boolean;
    lastMessageStats?: {
        timeToFirstToken?: number;
        totalTime?: number;
        tokens?: number;
    } | null;
    attachmentCapabilities?: {
        supportsImageUrls: boolean;
        supportsFileUrls: boolean;
        supportsYoutubeVideos: boolean;
    };
}

export function PromptBuilderRightPanel({
    conversationMessages,
    onClearConversation,
    variables,
    testVariables,
    onTestVariableChange,
    expandedVariable,
    onExpandedVariableChange,
    chatInput,
    onChatInputChange,
    onSendMessage,
    isTestingPrompt,
    autoClear,
    onAutoClearChange,
    submitOnEnter,
    onSubmitOnEnterChange,
    messages,
    isStreamingMessage = false,
    lastMessageStats = null,
    attachmentCapabilities = { supportsImageUrls: false, supportsFileUrls: false, supportsYoutubeVideos: false },
}: PromptBuilderRightPanelProps) {
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
                        {conversationMessages.map((msg, idx) => {
                            // Check if this is the last message and it's currently being streamed
                            const isLastMessage = idx === conversationMessages.length - 1;
                            const isStreaming = isLastMessage && msg.role === "assistant" && isStreamingMessage;
                            
                            return (
                                <div key={idx}>
                                    {msg.role === "user" ? (
                                        <div className="bg-blue-100 dark:bg-blue-900/30 ml-12 p-4 rounded-lg">
                                            <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                                                User
                                            </div>
                                            <div className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{msg.content}</div>
                                        </div>
                                    ) : (
                                        <div className="mr-12">
                                            <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                                                Assistant
                                            </div>
                                            {msg.content.startsWith("Error:") ? (
                                                <PromptErrorMessage message={msg.content.replace("Error: ", "")} />
                                            ) : (
                                                <EnhancedChatMarkdown
                                                    content={msg.content}
                                                    type="message"
                                                    role="assistant"
                                                    isStreamActive={isStreaming}
                                                    hideCopyButton={true}
                                                    allowFullScreenEditor={false}
                                                    className="bg-gray-50 dark:bg-gray-900"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Test Input Area */}
            <div className="p-4 bg-gray-900 dark:bg-gray-900 space-y-3">
                {/* Clear conversation button and stats */}
                {conversationMessages.length > 0 && (
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearConversation}
                            className="text-gray-400 dark:text-gray-400 hover:text-gray-300"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear conversation
                        </Button>
                        <PromptStats 
                            timeToFirstToken={lastMessageStats?.timeToFirstToken}
                            totalTime={lastMessageStats?.totalTime}
                            tokens={lastMessageStats?.tokens}
                        />
                    </div>
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
                                        onClick={() => onExpandedVariableChange(variable)}
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
                                        onOpenChange={(open) => !open && onExpandedVariableChange(null)}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                                onClick={() => onExpandedVariableChange(variable)}
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
                                                    onChange={(e) => onTestVariableChange(variable, e.target.value)}
                                                    placeholder={`Enter ${variable}...`}
                                                    autoFocus
                                                    onFocus={(e) => e.target.select()}
                                                    rows={8}
                                                    className="w-full px-3 py-2 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none"
                                                />
                                                <div className="flex justify-end">
                                                    <Button size="sm" onClick={() => onExpandedVariableChange(null)}>
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
                            onChange={(e) => onChatInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Add a message to the bottom of your prompt..."
                            className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none min-h-[70px] max-h-[200px] overflow-y-auto"
                            style={{
                                scrollbarWidth: "thin",
                                scrollbarColor: "#4B5563 transparent",
                            }}
                        />
                        <Button
                            onClick={onSendMessage}
                            disabled={isSendDisabled}
                            className="h-8 w-8 p-0 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600"
                        >
                            <ArrowUp className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Bottom Controls */}
                    <div className="flex items-center justify-between px-3 py-1">
                        <Popover open={isAttachmentMenuOpen} onOpenChange={setIsAttachmentMenuOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-300">
                                    <Paperclip className="w-4 h-4" />
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
                                        <Youtube className="w-4 h-4 mr-2" />
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

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onSubmitOnEnterChange(!submitOnEnter)}
                                className={`h-8 px-3 text-xs ${
                                    submitOnEnter
                                        ? "text-gray-200 dark:text-gray-200"
                                        : "text-gray-400 dark:text-gray-400 hover:text-gray-300"
                                }`}
                            >
                                <CornerDownLeft className="w-3.5 h-3.5 mr-1.5" />
                                Submit on Enter
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onAutoClearChange(!autoClear)}
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
    );
}

