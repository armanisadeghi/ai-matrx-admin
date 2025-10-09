import React, { useState, RefObject, useMemo } from "react";
import { MessageSquare, Trash2, Paperclip, RefreshCw, ArrowUp, CornerDownLeft, Image, FileText, Youtube, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EnhancedChatMarkdown from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";
import { PromptErrorMessage } from "./PromptErrorMessage";
import { PromptStats } from "./PromptStats";
import { useAppSelector } from "@/lib/redux";
import { selectPrimaryResponseTextByTaskId, selectResponseEndedByListenerId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { PromptVariable } from "./PromptBuilder";
import { formatText } from "@/utils/text-case-converter";

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
    variableDefaults: PromptVariable[];
    onVariableValueChange: (variableName: string, value: string) => void;
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
    currentTaskId?: string | null;
    messageStartTime?: number | null;
    timeToFirstTokenRef?: RefObject<number | undefined>;
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
    onMessageContentChange?: (messageIndex: number, newContent: string) => void;
}

export function PromptBuilderRightPanel({
    conversationMessages,
    onClearConversation,
    variableDefaults,
    onVariableValueChange,
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
    currentTaskId = null,
    messageStartTime = null,
    timeToFirstTokenRef,
    lastMessageStats = null,
    attachmentCapabilities = { supportsImageUrls: false, supportsFileUrls: false, supportsYoutubeVideos: false },
    onMessageContentChange,
}: PromptBuilderRightPanelProps) {
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
    
    // Get streaming text from Redux - this doesn't cause parent re-renders
    const streamingText = useAppSelector((state) => 
        currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ""
    );
    const isResponseEnded = useAppSelector((state) =>
        currentTaskId ? selectResponseEndedByListenerId(currentTaskId)(state) : false
    );
        
    // Calculate live stats during streaming (only in this component, not in parent)
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
    }, [streamingText, currentTaskId, messageStartTime, timeToFirstTokenRef]);
    
    // Build the messages to display: conversation messages + streaming message (if active)
    const displayMessages = useMemo(() => {
        if (currentTaskId && streamingText) {
            // Add the streaming message
            return [...conversationMessages, { role: "assistant", content: streamingText }];
        }
        return conversationMessages;
    }, [conversationMessages, currentTaskId, streamingText]);
    
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
                {displayMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
                        <MessageSquare className="w-12 h-12 mb-3" />
                        <p className="text-xs">Your conversation will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayMessages.map((msg, idx) => {
                            // Check if this is the last message and it's currently being streamed
                            const isLastMessage = idx === displayMessages.length - 1;
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
                                                    allowFullScreenEditor={true}
                                                    className="bg-gray-50 dark:bg-gray-900"
                                                    onContentChange={onMessageContentChange ? (newContent) => onMessageContentChange(idx, newContent) : undefined}
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
            <div className="p-4 bg-gray-100 dark:bg-gray-900 space-y-3">
                {/* Clear conversation button and stats */}
                {displayMessages.length > 0 && (
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
                            timeToFirstToken={liveStats?.timeToFirstToken || lastMessageStats?.timeToFirstToken}
                            totalTime={liveStats?.totalTime || lastMessageStats?.totalTime}
                            tokens={liveStats?.tokens || lastMessageStats?.tokens}
                        />
                    </div>
                )}

                {/* Unified Chat Container with Variables and Input */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
                    {/* Variable Inputs */}
                    {variableDefaults.length > 0 && (
                        <div>
                            {variableDefaults.map((variable) => (
                                <Popover
                                    key={variable.name}
                                    open={expandedVariable === variable.name}
                                    onOpenChange={(open) => !open && onExpandedVariableChange(null)}
                                >
                                    <PopoverTrigger asChild>
                                        <div
                                            className="flex items-center gap-2 px-1 py-1.5 border-b border-gray-300 dark:border-gray-700 cursor-text hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                            onClick={() => onExpandedVariableChange(variable.name)}
                                        >
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                {formatText(variable.name)}
                                            </span>
                                            :
                                            <div className="flex-1 text-xs text-gray-900 dark:text-gray-200 truncate">
                                                {variable.defaultValue ? (
                                                    <span className="whitespace-nowrap">
                                                        {variable.defaultValue.replace(/\n/g, " ↵ ")}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-600">Enter {formatText(variable.name)}...</span>
                                                )}
                                            </div>
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
                                                className="flex-1 w-full px-3 py-2 text-xs text-gray-900 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none scrollbar-thin"
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
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
                            className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none min-h-[70px] max-h-[200px] overflow-y-auto scrollbar-thin"
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

