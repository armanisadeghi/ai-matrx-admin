import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createChatSelectors } from "@/lib/redux/entity/custom-selectors/chatSelectors";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";

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
    
    // Group conversations by date section with expanded categories
    const groupedConversations = filteredConversations.reduce((acc, convo) => {
        // Ensure we're only using updatedAt for date calculations
        if (!convo.updatedAt) return acc;

        // Parse the timestamp and handle timezone consistently
        // For timestamptz from database, we'll convert everything to UTC for comparison
        const date = new Date(convo.updatedAt);

        // Get current date in UTC
        const now = new Date();

        // Create UTC versions of all our date boundaries to match the UTC timestamps
        // Use the same time (midnight) for all boundaries to ensure consistent comparison
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const yesterdayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
        const thisWeekStart = startOfWeek(todayStart);
        const lastWeekStart = startOfWeek(new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000));
        const lastWeekEnd = new Date(lastWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
        const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));

        // Debug logging if needed
        // console.log('Date being evaluated:', date.toISOString());
        // console.log('Today start:', todayStart.toISOString());
        // console.log('Yesterday start:', yesterdayStart.toISOString());

        let section = "Earlier";

        if (date >= todayStart) {
            section = "Today";
        } else if (date >= yesterdayStart && date < todayStart) {
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

    // Debug logging if needed
    // Object.entries(groupedConversations).forEach(([section, convos]) => {
    //     console.log(`Section: ${section}, Count: ${convos.length}`);
    //     convos.forEach(c => console.log(`  - ${c.label || 'Untitled'}: ${new Date(c.updatedAt || '').toISOString()}`));
    // });

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
    const formatRelativeTime = useCallback((timestamp: string | Date | undefined): string => {
        if (!timestamp) return "Unknown date";

        const date = new Date(timestamp);
        const now = new Date();

        // Calculate time difference in milliseconds
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Format relative time
        if (diffMins < 1) {
            return "Just now";
        } else if (diffMins < 60) {
            return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
        } else {
            // For older dates, return the formatted date
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
    };
}

export default useConversationPanel;
