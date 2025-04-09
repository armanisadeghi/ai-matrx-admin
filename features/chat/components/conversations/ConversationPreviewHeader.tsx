import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Edit, Save, X, ArrowRight } from "lucide-react";
import { ConversationModified } from "@/features/chat/hooks/useConversationPanel";

interface ConversationPreviewHeaderProps {
    conversation: ConversationModified;
    onUpdate: (id: string, updates: Partial<ConversationModified>) => void;
    editable: boolean;
    onNavigate: (id: string) => void;
}

const ConversationPreviewHeader: React.FC<ConversationPreviewHeaderProps> = ({ conversation, onUpdate, editable, onNavigate }) => {
    // State
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editLabel, setEditLabel] = useState(conversation.label);
    const [editDescription, setEditDescription] = useState(conversation.description || "");
    const [editKeywords, setEditKeywords] = useState(conversation.keywords?.join(", ") || "");

    // Refs
    const labelInputRef = useRef<HTMLInputElement>(null);

    // Get first line of description for collapsed view
    const getFirstLine = (text?: string) => {
        if (!text) return "";
        const firstLineBreak = text.indexOf("\n");
        if (firstLineBreak > 0) {
            return text.substring(0, firstLineBreak);
        }
        // If no line break, use a character limit with ellipsis
        if (text.length > 100) {
            return text.substring(0, 100);
        }
        return text;
    };

    const firstLine = getFirstLine(conversation.description);
    const hasMoreContent =
        conversation.description &&
        (conversation.description.length > firstLine.length || (conversation.keywords && conversation.keywords.length > 0));

    // Handle event subscription for edit event from context menu
    useEffect(() => {
        const handleEditEvent = (e: CustomEvent) => {
            if (e.detail && e.detail.id === conversation.id) {
                setIsEditing(true);
                setIsExpanded(true);
            }
        };

        document.addEventListener("edit-conversation-metadata", handleEditEvent as EventListener);

        return () => {
            document.removeEventListener("edit-conversation-metadata", handleEditEvent as EventListener);
        };
    }, [conversation.id]);

    // Focus on label input when editing starts
    useEffect(() => {
        if (isEditing && labelInputRef.current) {
            labelInputRef.current.focus();
        }
    }, [isEditing]);

    // Handle save changes
    const handleSave = () => {
        const processedKeywords = editKeywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k.length > 0);

        onUpdate(conversation.id, {
            label: editLabel,
            description: editDescription,
            keywords: processedKeywords.length > 0 ? processedKeywords : undefined,
        });

        setIsEditing(false);
    };

    // Handle cancel editing
    const handleCancel = () => {
        setEditLabel(conversation.label);
        setEditDescription(conversation.description || "");
        setEditKeywords(conversation.keywords?.join(", ") || "");
        setIsEditing(false);
    };

    // Handle key presses in edit mode
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            handleCancel();
        } else if (e.key === "Enter" && e.ctrlKey) {
            handleSave();
        }
    };

    // Start editing
    const startEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setIsExpanded(true);
    };

    // Navigate to conversation
    const handleNavigate = (e: React.MouseEvent) => {
        e.stopPropagation();
        onNavigate(conversation.id);
    };

    // Render edit mode
    if (isEditing) {
        return (
            <div
                className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800"
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-3">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Label</label>
                    <input
                        ref={labelInputRef}
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Conversation title"
                    />
                </div>

                <div className="mb-3">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Description</label>
                    <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                        placeholder="Add a description"
                    />
                </div>

                <div className="mb-3">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Keywords (comma separated)</label>
                    <input
                        type="text"
                        value={editKeywords}
                        onChange={(e) => setEditKeywords(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ai, chat, research"
                    />
                </div>

                <div className="flex justify-end space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCancel();
                        }}
                        className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center"
                    >
                        <X size={16} className="mr-1" />
                        Cancel
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSave();
                        }}
                        className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 flex items-center"
                    >
                        <Save size={16} className="mr-1" />
                        Save
                    </button>
                </div>
            </div>
        );
    }

    // Render view mode with integrated label and collapse/expand button
    return (
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-b-xl border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-850" onClick={(e) => e.stopPropagation()}>
            {/* Integrated header with label and toggle button */}
            <div
                className={`px-4 py-3 flex justify-between items-center ${hasMoreContent ? "cursor-pointer" : ""}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (hasMoreContent) {
                        setIsExpanded(!isExpanded);
                    }
                }}
            >
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {conversation.label}
                </h2>

                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    {editable && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                startEditing(e);
                            }}
                            className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            aria-label="Edit"
                        >
                            <Edit size={14} />
                        </button>
                    )}

                    {hasMoreContent && (
                        <div className="ml-2 mt-1">
                            {isExpanded ? (
                                <ChevronUp size={16} className="text-zinc-500 dark:text-zinc-400" />
                            ) : (
                                <ChevronDown size={16} className="text-zinc-500 dark:text-zinc-400" />
                            )}
                        </div>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(e);
                        }}
                        className="ml-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-850 text-zinc-900 dark:text-zinc-100 text-sm flex items-center shrink-0"
                    >
                        <span>Open</span>
                        <ArrowRight size={14} className="ml-1" />
                    </button>
                </div>
            </div>

            {/* Collapsible content section */}
            {(hasMoreContent || isExpanded) && (
                <div className={`px-4 pb-3 ${isExpanded ? "block" : "hidden"}`} onClick={(e) => e.stopPropagation()}>
                    {conversation.description && (
                        <div className="mb-3">
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">{conversation.description}</p>
                        </div>
                    )}

                    {conversation.keywords && conversation.keywords.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Keywords</p>
                            <div className="flex flex-wrap gap-1">
                                {conversation.keywords.map((keyword, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                    >
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {editable && !conversation.description && !conversation.keywords?.length && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                startEditing(e);
                            }}
                            className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                        >
                            <Edit size={12} className="mr-1" />
                            Add description and keywords to help with search
                        </button>
                    )}
                </div>
            )}

            {/* Show preview of description when collapsed */}
            {hasMoreContent && !isExpanded && conversation.description && (
                <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {firstLine}
                        {conversation.description.length > firstLine.length && "..."}
                    </p>
                </div>
            )}

            {/* Show add description button when no description and not expanded */}
            {editable && !conversation.description && !isExpanded && (
                <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            startEditing(e);
                        }}
                        className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                    >
                        <Edit size={12} className="mr-1" />
                        Add description and keywords
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConversationPreviewHeader;
