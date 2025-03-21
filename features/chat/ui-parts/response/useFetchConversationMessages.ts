"use client";

import { useCallback, useEffect, useMemo } from "react";
import { FetchRecordsPayload, RootState, useAppDispatch, useEntityTools } from "@/lib/redux";
import { useSelector } from "react-redux";
import { MessageRecordWithKey } from "@/types";

export function useFetchConversationMessages(conversationId: string, isNewChat: boolean = false) {
    const dispatch = useAppDispatch();
    const { actions, selectors } = useEntityTools("message");

    const loadingState = useSelector((state: RootState) => selectors.selectLoadingState(state));
    const currentMessagesRaw = useSelector((state: RootState) => 
        selectors.selectRecordsByFieldValue(state, "conversationId", conversationId)) as MessageRecordWithKey[];

    const currentMessages = useMemo(() => {
        return [...currentMessagesRaw].sort((a, b) => a.displayOrder - b.displayOrder);
    }, [currentMessagesRaw]);

    const nextDisplayOrder = useMemo(() => 
        Math.max(...currentMessages.map((m) => m.displayOrder)) + 1, 
        [currentMessages]
    );
    const nextSystemOrder = useMemo(() => 
        Math.max(...currentMessages.map((m) => m.systemOrder)) + 1, 
        [currentMessages]
    );
  
    const fetchAllMessages = useCallback(() => {
        if (!conversationId) return;

        const payload: FetchRecordsPayload = {
            page: 1,
            pageSize: 100,
            options: {
                filters: {
                    conditions: [
                        {
                            field: "conversation_id",
                            operator: "eq",
                            value: conversationId,
                        },
                    ],
                    replace: true,
                },
                sort: {
                    field: "display_order",
                    direction: "asc",
                },
            },
        };

        dispatch(actions.fetchRecords(payload));
    }, [dispatch, actions, conversationId]);

    useEffect(() => {
        if (isNewChat) return;
        fetchAllMessages();
    }, [isNewChat]);

    return {
        currentMessages,
        nextDisplayOrder,
        nextSystemOrder,
        isLoading: loadingState?.loading || false,
        hasError: !!loadingState?.error,
        error: loadingState?.error,
        refetch: fetchAllMessages,
    };
}