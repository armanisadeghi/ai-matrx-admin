'use client';

import React, { useRef, useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { Copy, Check, ChevronDown, MessageSquare, AlertCircle, Edit, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarkdownStream from '@/components/MarkdownStream';
import type { ChatMessage } from '../context/ChatContext';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
import { parseResourcesFromMessage, extractMessageWithoutResources, messageContainsResources } from '@/features/prompts/utils/resource-parsing';
import { ResourcesContainer } from '@/features/prompts/components/resource-display/ResourceDisplay';

// ============================================================================
// LAZY LOADED COMPONENTS (Heavy dependencies - only load when needed)
// ============================================================================

const FullScreenMarkdownEditor = lazy(() => import('@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor'));
const PublicMessageOptionsMenu = lazy(() => import('./PublicMessageOptionsMenu'));
const HtmlPreviewModal = lazy(() => import('./HtmlPreviewModal'));

// ============================================================================
// USER MESSAGE (Matching PromptUserMessage UI)
// ============================================================================

interface UserMessageProps {
    message: ChatMessage;
}

function UserMessage({ message }: UserMessageProps) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [shouldBeCollapsible, setShouldBeCollapsible] = useState(false);
    const measureRef = useRef<HTMLDivElement>(null);
    const previousContentRef = useRef<string>("");

    // Parse resources from content
    const hasResources = useMemo(() => messageContainsResources(message.content), [message.content]);
    const resources = useMemo(() => hasResources ? parseResourcesFromMessage(message.content) : [], [message.content, hasResources]);
    const textContent = useMemo(() => hasResources ? extractMessageWithoutResources(message.content) : message.content, [message.content, hasResources]);

    // Determine if content is long enough to be collapsible
    useEffect(() => {
        if (measureRef.current) {
            const COLLAPSE_THRESHOLD = 48; // 12 * 4px = 48px (max-h-12)
            const contentHeight = measureRef.current.scrollHeight;
            const isContentLongEnough = contentHeight > COLLAPSE_THRESHOLD;
            const contentChanged = previousContentRef.current !== textContent;

            setShouldBeCollapsible(isContentLongEnough);

            if (contentChanged) {
                if (isContentLongEnough) {
                    setIsCollapsed(true);
                } else {
                    setIsCollapsed(false);
                }
                previousContentRef.current = textContent;
            }
        }
    }, [textContent]);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(message.content).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const toggleCollapse = () => {
        if (shouldBeCollapsible) {
            setIsCollapsed(!isCollapsed);
        }
    };

    const handleHeaderClick = () => {
        if (shouldBeCollapsible) {
            toggleCollapse();
        }
    };

    return (
        <div className="ml-12">
            {/* Unified container with border and background - matching PromptUserMessage */}
            <div className="bg-muted border border-border rounded-lg">
                {/* Thin header with copy button */}
                <div
                    className="flex items-center justify-end px-2 pt-1 pb-0 cursor-pointer rounded-lg"
                    onClick={handleHeaderClick}
                >
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopy}
                            className="h-6 w-6 p-0 text-muted-foreground"
                            title="Copy"
                        >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-2 pb-2 relative">
                    <div className="space-y-2">
                        {/* Display resources first if any */}
                        {resources.length > 0 && (
                            <ResourcesContainer resources={resources} />
                        )}

                        {/* Display text content */}
                        {textContent.trim() && (
                            <div className="relative">
                                <div
                                    ref={measureRef}
                                    className={`text-xs text-foreground whitespace-pre-wrap break-words overflow-hidden transition-all duration-300 ${
                                        shouldBeCollapsible && isCollapsed ? "max-h-12" : ""
                                    }`}
                                >
                                    {textContent}
                                </div>
                                {shouldBeCollapsible && isCollapsed && (
                                    <>
                                        {/* Gradient fade overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-muted via-muted/60 to-transparent pointer-events-none" />
                                        {/* Expand chevron button */}
                                        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={toggleCollapse}
                                                className="h-6 w-6 p-0 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                title="Expand message"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Display attached files if any */}
                        {message.files && message.files.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {message.files.map((file, index) => (
                                    <div
                                        key={index}
                                        className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700"
                                    >
                                        <img src={file} alt="Attachment" className="h-20 w-20 object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// ASSISTANT MESSAGE (Matching PromptAssistantMessage UI)
// ============================================================================

interface AssistantMessageProps {
    message: ChatMessage;
    streamEvents?: StreamEvent[];
    isStreaming?: boolean;
    onContentChange?: (messageId: string, newContent: string) => void;
}

function AssistantMessage({ message, streamEvents, isStreaming = false, onContentChange }: AssistantMessageProps) {
    const [isCopied, setIsCopied] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const moreOptionsButtonRef = useRef<HTMLButtonElement>(null);
    const showLoading = message.status === 'pending' || (message.status === 'streaming' && !message.content);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy: ", err);
        }
    };

    const handleEditClick = () => {
        setIsEditorOpen(true);
    };

    const handleSaveEdit = (newContent: string) => {
        if (onContentChange) {
            onContentChange(message.id, newContent);
        }
        setIsEditorOpen(false);
    };

    const handleCancelEdit = () => {
        setIsEditorOpen(false);
    };

    const toggleOptionsMenu = () => {
        setShowOptionsMenu(!showOptionsMenu);
    };

    const handleShowHtmlPreview = () => {
        setShowHtmlModal(true);
    };

    const handleCloseHtmlModal = () => {
        setShowHtmlModal(false);
    };

    // Check if this is an error message
    const isError = message.status === 'error';

    if (showLoading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm">Thinking...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm text-destructive">{message.content || 'An error occurred'}</div>
            </div>
        );
    }

    return (
        <div>
            {/* Markdown content - matching PromptAssistantMessage */}
            {streamEvents && streamEvents.length > 0 ? (
                <MarkdownStream
                    events={streamEvents}
                    type="message"
                    role="assistant"
                    isStreamActive={isStreaming}
                    hideCopyButton={true}
                    allowFullScreenEditor={false}
                    className="text-xs bg-transparent"
                />
            ) : (
                <MarkdownStream
                    content={message.content}
                    type="message"
                    role="assistant"
                    isStreamActive={isStreaming && message.status === 'streaming'}
                    hideCopyButton={true}
                    allowFullScreenEditor={false}
                    className="text-xs bg-transparent"
                />
            )}
            
            {/* Action buttons - only show when not streaming */}
            {!isStreaming && message.content && (
                <div className="flex items-center gap-1 mt-0.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-6 w-6 p-0 text-muted-foreground"
                        title="Copy"
                    >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    {onContentChange && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditClick}
                            className="h-6 w-6 p-0 text-muted-foreground"
                            title="Edit in full screen"
                        >
                            <Edit className="w-3.5 h-3.5" />
                        </Button>
                    )}
                    <Button
                        ref={moreOptionsButtonRef}
                        variant="ghost"
                        size="sm"
                        onClick={toggleOptionsMenu}
                        className="h-6 w-6 p-0 text-muted-foreground"
                        title="More options"
                    >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                    
                    {/* Lazy load menu only when opened */}
                    {showOptionsMenu && (
                        <Suspense fallback={null}>
                            <PublicMessageOptionsMenu
                                isOpen={showOptionsMenu}
                                content={message.content}
                                onClose={() => setShowOptionsMenu(false)}
                                onShowHtmlPreview={handleShowHtmlPreview}
                                onEditContent={handleEditClick}
                                anchorElement={moreOptionsButtonRef.current}
                            />
                        </Suspense>
                    )}
                </div>
            )}

            {/* Lazy load editor only when opened */}
            {isEditorOpen && (
                <Suspense fallback={null}>
                    <FullScreenMarkdownEditor
                        isOpen={isEditorOpen}
                        initialContent={message.content}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                        tabs={["write", "markdown", "wysiwyg", "preview"]}
                        initialTab="write"
                    />
                </Suspense>
            )}

            {/* Lazy load HTML preview only when opened */}
            {showHtmlModal && (
                <Suspense fallback={null}>
                    <HtmlPreviewModal
                        isOpen={showHtmlModal}
                        onClose={handleCloseHtmlModal}
                        content={message.content}
                    />
                </Suspense>
            )}
        </div>
    );
}

// ============================================================================
// MESSAGE LIST (Matching SmartMessageList UI)
// ============================================================================

interface MessageListProps {
    messages: ChatMessage[];
    streamEvents?: StreamEvent[];
    isStreaming?: boolean;
    emptyStateMessage?: string;
    className?: string;
    /** Compact mode: reduces spacing and simplifies message display */
    compact?: boolean;
    /** Callback when a message content is edited */
    onMessageContentChange?: (messageId: string, newContent: string) => void;
}

export function MessageList({ 
    messages, 
    streamEvents, 
    isStreaming,
    emptyStateMessage = "Ready to start chatting",
    className = "",
    compact = false,
    onMessageContentChange,
}: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    // Empty state - matching SmartMessageList
    if (messages.length === 0 && !isStreaming) {
        return (
            <div className={`flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground ${className}`}>
                <MessageSquare className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">{emptyStateMessage}</p>
                <p className="text-sm mt-2 text-center px-6">
                    Type your message below to get started
                </p>
            </div>
        );
    }

    // Adjust spacing classes based on compact mode
    const spacingClasses = compact 
        ? "space-y-2 pt-0 pb-2" 
        : "space-y-6 pt-0 pb-4";

    return (
        <div className={`${spacingClasses} ${className}`}>
            {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isLastAssistant = isLastMessage && message.role === 'assistant';

                return (
                    <div key={message.id}>
                        {message.role === 'user' ? (
                            <UserMessage message={message} />
                        ) : (
                            <AssistantMessage
                                message={message}
                                streamEvents={isLastAssistant ? streamEvents : undefined}
                                isStreaming={isLastAssistant && isStreaming}
                                onContentChange={onMessageContentChange}
                            />
                        )}
                    </div>
                );
            })}

            {/* Invisible div for auto-scrolling */}
            <div ref={messagesEndRef} className="h-4" />
        </div>
    );
}

export default MessageList;
