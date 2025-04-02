import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createChatSelectors } from "@/lib/redux/entity/custom-selectors/chatSelectors";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
import { ConversationDataOptional } from "@/types/AutomationSchemaTypes";

export function useConversationPanel() {
    const router = useRouter();
    const pathname = usePathname();
    const selectors = createChatSelectors();
    const dispatch = useAppDispatch();
    const chatActions = getChatActionsWithThunks();

    // UI State
    const [expanded, setExpanded] = useState(true);
    const [contentSearch, setContentSearch] = useState("");
    const [labelSearch, setLabelSearch] = useState("");
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

    // Context Menu State
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [contextMenuConversationId, setContextMenuConversationId] = useState<string | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Get conversations from Redux
    const conversationsArray = useAppSelector(selectors.conversationsArray);

    // Filter conversations based on search terms
    const filteredConversations = conversationsArray.filter((convo) => {
        const matchesLabel = convo.label?.toLowerCase().includes(labelSearch.toLowerCase()) ?? true;
        const matchesContent =
            !contentSearch ||
            // Search in content - this can be expanded based on your data structure
            (convo.label?.toLowerCase().includes(contentSearch.toLowerCase()) ?? false);
        return matchesLabel && matchesContent;
    });

    // Group conversations by date section
    const groupedConversations = filteredConversations.reduce((acc, convo) => {
        const date = new Date(convo.createdAt);

        let section = "Earlier";
        if (isToday(date)) {
            section = "Today";
        } else if (isYesterday(date)) {
            section = "Yesterday";
        } else if (date.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
            section = "This Week";
        }

        if (!acc[section]) {
            acc[section] = [];
        }

        acc[section].push(convo);
        return acc;
    }, {} as Record<string, ConversationDataOptional[]>);

    // Sort conversations within each group by updatedAt/createdAt
    Object.keys(groupedConversations).forEach((key) => {
        groupedConversations[key].sort((a, b) => {
            const dateA = a.updatedAt || a.createdAt;
            const dateB = b.updatedAt || b.createdAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    });

    // Action to fetch conversation messages
    const handleCoordinatedFetch = useCallback(
        (convoId: string) => {
            dispatch(chatActions.coordinateActiveConversationAndMessageFetch(convoId));
        },
        [dispatch, chatActions]
    );

    // Handle conversation selection with routing
    const handleSelectConversation = useCallback(
        (convoId: string) => {
            setSelectedConversation(convoId);
            router.push(`/chat/${convoId}`);
        },
        [router]
    );

    // Handle conversation preview without routing
    const handlePreviewConversation = useCallback(
        (convoId: string) => {
            setSelectedConversation(convoId);
            handleCoordinatedFetch(convoId);
        },
        [handleCoordinatedFetch]
    );

    // Handle context menu
    const handleContextMenu = useCallback((e: React.MouseEvent, convoId: string) => {
        e.preventDefault();
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
        setContextMenuConversationId(convoId);
        setShowContextMenu(true);
    }, []);

    // Handle context menu actions
    const handleEdit = useCallback((id: string) => {
        // Implement edit logic here
        setShowContextMenu(false);
    }, []);

    const handleDelete = useCallback((id: string) => {
        // Implement delete logic here
        setShowContextMenu(false);
    }, []);

    // Format the relative time for a conversation
    const formatRelativeTime = useCallback((date: Date) => {
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            return "Just now";
        } else if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
        } else {
            return format(date, "dd MMM yyyy");
        }
    }, []);

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setShowContextMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Create new chat
    const handleCreateNewChat = useCallback(() => {
        router.push("/chat/new");
    }, [router]);

    return {
        // State
        expanded,
        setExpanded,
        contentSearch,
        setContentSearch,
        labelSearch,
        setLabelSearch,
        selectedConversation,
        showContextMenu,
        contextMenuPosition,
        contextMenuConversationId,
        contextMenuRef,

        // Data
        conversationsArray,
        groupedConversations,

        // Actions
        handleSelectConversation,
        handlePreviewConversation,
        handleContextMenu,
        handleCoordinatedFetch,
        handleEdit,
        handleDelete,
        handleCreateNewChat,
        formatRelativeTime,
    };
}

export default useConversationPanel;
