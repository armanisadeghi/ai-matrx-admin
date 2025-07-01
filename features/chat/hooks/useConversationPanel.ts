import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, startOfDay, endOfDay } from "date-fns";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createChatSelectors } from "@/lib/redux/entity/custom-selectors/chatSelectors";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
import formatRelativeTime from "@/features/chat/components/utils/formatRelativeTime";
import { useConversationRouting } from "@/hooks/ai/chat/useConversationRouting";

export type ConversationModified = {
    id?: string;
    description?: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    metadata?: Record<string, unknown>;
    label?: string;
    keywords?: string[];
};

export function useConversationPanel() {
    const router = useRouter();
    const pathname = usePathname();
    const selectors = createChatSelectors();
    const dispatch = useAppDispatch();
    const chatActions = getChatActionsWithThunks();
    const { navigateToConversation } = useConversationRouting({});

    // UI State
    const [expanded, setExpanded] = useState(true);
    const [contentSearch, setContentSearch] = useState("");
    const [labelSearch, setLabelSearch] = useState("");
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(1000);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Context Menu State
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [contextMenuConversationId, setContextMenuConversationId] = useState<string | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

        // Get conversations from Redux
    const conversationsArray = useAppSelector(selectors.conversationsArray);
    
    // Get current date for calculations
    const now = new Date();

    // Debug: Log a sample of conversation IDs to verify they're valid
    if (conversationsArray.length > 0) {
        console.log('Sample conversation IDs:', conversationsArray.slice(0, 3).map(c => ({ id: c.id, label: c.label })));
    }

    // Filter conversations based on search terms
    const filteredConversations = conversationsArray.filter((convo) => {
        const matchesLabel = convo.label?.toLowerCase().includes(labelSearch.toLowerCase()) ?? true;

        // Enhanced content search to include description and keywords
        const matchesContent =
            !contentSearch ||
            // Search in label
            (convo.label?.toLowerCase().includes(contentSearch.toLowerCase()) ?? false) ||
            // Search in description
            (convo.description?.toLowerCase().includes(contentSearch.toLowerCase()) ?? false) ||
            // Search in keywords (if they exist and are an array)
            (Array.isArray(convo.keywords) &&
                convo.keywords.some((keyword) => keyword.toLowerCase().includes(contentSearch.toLowerCase())));

        return matchesLabel && matchesContent;
    });

    // Debug logging removed
     
    // Debug boundaries once
    const todayStart = startOfDay(now);
    const yesterdayStart = startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const yesterdayEnd = endOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Debug boundaries removed - issue is pagination/fetch ordering, not date grouping

    // Group conversations by date section with expanded categories
    const groupedConversations = filteredConversations.reduce((acc, convo) => {
        // Ensure we're only using updatedAt for date calculations
        if (!convo.updatedAt) return acc;

        // Parse the timestamp and handle timezone consistently
        const date = new Date(convo.updatedAt);

        // Debug logging removed

        let section = "Earlier";

        // Categorize by date ranges (most recent first, no overlaps)
        if (date >= todayStart) {
            section = "Today";
        } else if (date >= yesterdayStart && date <= yesterdayEnd) {
            section = "Yesterday";
        } else if (date >= thisWeekStart && date < yesterdayStart) {
            section = "This Week";
        } else if (date >= lastWeekStart && date <= lastWeekEnd) {
            section = "Last Week";
        } else if (date >= thisMonthStart && date < thisWeekStart) {
            section = "This Month";
        } else if (date >= lastMonthStart && date <= lastMonthEnd) {
            section = "Last Month";
        }
        // Anything older falls into "Earlier"

        // Debug logging removed

        // Ensure the conversation object conforms to ConversationModified, especially the keywords
        const modifiedConvo: ConversationModified = {
            ...convo,
            keywords:
                convo.keywords && typeof convo.keywords === "object" && !Array.isArray(convo.keywords)
                    ? Object.keys(convo.keywords)
                    : Array.isArray(convo.keywords)
                    ? convo.keywords
                    : undefined, // Keep if already array, else undefined
        };

        if (!acc[section]) {
            acc[section] = [];
        }

        acc[section].push(modifiedConvo); // Push the modified conversation
        return acc;
    }, {} as Record<string, ConversationModified[]>);

    // Sort conversations within each group by updatedAt (most recent first)
    Object.keys(groupedConversations).forEach((key) => {
        groupedConversations[key].sort((a, b) => {
            // Only use updatedAt, never fall back to createdAt
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA; // Sort in descending order (newest first)
        });
    });

    // Debug logging removed

    // Define the display order for the sections
    const sectionDisplayOrder = ["Today", "Yesterday", "This Week", "Last Week", "This Month", "Last Month", "Earlier"];

    // Sort the sections based on the display order
    const orderedGroupedConversations = Object.entries(groupedConversations)
        .sort(([keyA], [keyB]) => {
            return sectionDisplayOrder.indexOf(keyA) - sectionDisplayOrder.indexOf(keyB);
        })
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {} as Record<string, ConversationModified[]>);

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
            console.log('Navigating to conversation:', convoId);
            console.log('Route will be:', `/chat/${convoId}`);
            console.log('Current pathname:', pathname);
            setSelectedConversation(convoId);
            
            // Try using window.location as a fallback to test if router.push is the issue
            const targetRoute = `/chat/${convoId}`;
            console.log('Attempting router.push to:', targetRoute);
            
            try {
                router.push(targetRoute);
                console.log('router.push completed');
            } catch (error) {
                console.error('router.push failed:', error);
                // Fallback to window.location
                window.location.href = targetRoute;
            }
        },
        [router, pathname]
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

    // Load more conversations (pagination)
    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore) return;
        
        setIsLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            // Use fetchRecords to load additional conversations
            await dispatch(chatActions.fetchAdditionalConversations(nextPage, pageSize));
            setCurrentPage(nextPage);
        } catch (error) {
            console.error("Failed to load more conversations:", error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [dispatch, chatActions, currentPage, pageSize, isLoadingMore]);

    // Check if there are potentially more conversations to load
    const hasMoreConversations = conversationsArray.length >= currentPage * pageSize;

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
        groupedConversations: orderedGroupedConversations,
        // Actions
        handleSelectConversation,
        handlePreviewConversation,
        handleContextMenu,
        handleCoordinatedFetch,
        handleEdit,
        handleDelete,
        handleCreateNewChat,
        formatRelativeTime,
        // Pagination
        handleLoadMore,
        isLoadingMore,
        hasMoreConversations,
        currentPage,
    };
}

export default useConversationPanel;
