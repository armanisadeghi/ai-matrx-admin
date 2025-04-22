"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { FetchRecordsPayload, RootState, useAppDispatch, useEntityTools } from "@/lib/redux";
import { useSelector } from "react-redux";
import { MessageRecordWithKey } from "@/types";
import { SocketManager } from "@/lib/redux/socket/SocketManager";

interface UseFetchConversationMessagesProps {
    conversationId: string | undefined;
    eventName?: string | undefined;
    fetchOnStreamEnd?: boolean;
    isNewChat?: boolean;
}

export function useFetchConversationMessages({
    conversationId,
    eventName,
    fetchOnStreamEnd = true,
    isNewChat = false,
}: UseFetchConversationMessagesProps) {
    const dispatch = useAppDispatch();
    const { actions, selectors } = useEntityTools("message");
    const loadingState = useSelector((state: RootState) => selectors.selectLoadingState(state));
    const currentMessagesRaw = useSelector((state: RootState) =>
        selectors.selectRecordsByFieldValue(state, "conversationId", conversationId)
    ) as MessageRecordWithKey[];

    const messageCount = useSelector((state: RootState) =>
        selectors.selectRecordCountByFieldValue(state, "conversationId", conversationId)
    );

    const socketManager = SocketManager.getInstance();
    const isStreaming = socketManager.isStreaming(eventName);

    const fetchAllMessages = useCallback(() => {
        if (!conversationId) return;
        const payload: FetchRecordsPayload = {
            page: 1,
            pageSize: 100,
            options: {
                filters: {
                    conditions: [
                        { field: "conversation_id", operator: "eq", value: conversationId },
                        { field: "display_order", operator: "neq", value: 0 },
                        { field: "role", operator: "neq", value: "system" },
                    ],
                    replace: true,
                },
                sort: { field: "display_order", direction: "asc" },
            },
        };
        dispatch(actions.fetchRecords(payload));
    }, [conversationId, dispatch, actions]);

    const messagesStateRef = useRef<{
        messagesToDisplay: MessageRecordWithKey[];
        isLastMessageAssistant: boolean;
    }>({
        messagesToDisplay: [],
        isLastMessageAssistant: false,
    });

    useEffect(() => {
        if (isNewChat) return;
        fetchAllMessages();
    }, [isNewChat, fetchAllMessages]);

    useEffect(() => {
        const sortedMessages = [...currentMessagesRaw]
            .filter((msg) => 
                typeof msg.displayOrder === "number" && 
                !isNaN(msg.displayOrder) && 
                msg.displayOrder !== 0
            )
            .sort((a, b) => a.displayOrder - b.displayOrder);

        const maxDisplayOrder = Math.max(...currentMessagesRaw.map((m) => m.displayOrder));
        const lastMessage = currentMessagesRaw.find((m) => m.displayOrder === maxDisplayOrder);
        const isLastAssistant = lastMessage?.role === "assistant" && !!messageCount;

        messagesStateRef.current = {
            messagesToDisplay: sortedMessages,
            isLastMessageAssistant: isLastAssistant,
        };
    }, [currentMessagesRaw, messageCount]);

    useEffect(() => {
        if (!eventName || !fetchOnStreamEnd || !conversationId) return;

        let wasStreaming = isStreaming;
        const checkStreamStatus = () => {
            const isStreamingNow = socketManager.isStreaming(eventName);
            if (wasStreaming && !isStreamingNow) {
                fetchAllMessages();
            }
            wasStreaming = isStreamingNow;
        };

        const intervalId = setInterval(checkStreamStatus, 500);
        return () => clearInterval(intervalId);
    }, [eventName, fetchOnStreamEnd, conversationId, fetchAllMessages, isStreaming]);

    const nextDisplayOrder = useMemo(() => 
        Math.max(...currentMessagesRaw.map((m) => m.displayOrder), -1) + 1, 
        [currentMessagesRaw]
    );
    const nextSystemOrder = useMemo(() => 
        Math.max(...currentMessagesRaw.map((m) => m.systemOrder), -1) + 1, 
        [currentMessagesRaw]
    );

    return {
        messageCount,
        messagesToDisplay: messagesStateRef.current.messagesToDisplay,
        isLastMessageAssistant: messagesStateRef.current.isLastMessageAssistant,
        isStreaming,
        nextDisplayOrder,
        nextSystemOrder,
        isLoading: loadingState?.loading || false,
        hasError: !!loadingState?.error,
        error: loadingState?.error,
        refetch: fetchAllMessages,
    };
}