// File: lib/hooks/useAIChat.ts

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { useUser } from '@/lib/hooks/useUser';
import {
    createChat,
    addMessage,
    setActiveChat,
    clearChat,
    completeChat,
    setError
} from '@/lib/redux/slices/aiChatSlice';
import {
    AIProvider,
    Chat,
    ContentPart,
    Message
} from "@/lib/ai/aiChat.types";

export function useAIChat() {
    const dispatch = useAppDispatch();
    const { userId } = useUser();
    const aiChatState = useAppSelector(state => state.aiChat);
    const userPreferences = useAppSelector(state => state.userPreferences);

    const createNewChat = useCallback((module: string, job: string) => {
        const provider = userPreferences.assistant.preferredProvider || 'default' as AIProvider;
        dispatch(createChat({ userId, provider, module, job }));
    }, [dispatch, userId, userPreferences.assistant.name]);

    const sendMessage = useCallback((chatId: string, content: ContentPart[], role: Message['role'] = 'user') => {
        dispatch(addMessage({ chatId, role, content, isVisibleToUser: true }));
        // Here you would typically also trigger an API call to the AI service
        // and then dispatch additional actions based on the response
    }, [dispatch]);

    const setActiveChatId = useCallback((chatId: string) => {
        dispatch(setActiveChat(chatId));
    }, [dispatch]);

    const deleteChat = useCallback((chatId: string) => {
        dispatch(clearChat(chatId));
    }, [dispatch]);

    const markChatComplete = useCallback((chatId: string, fullResponse: string) => {
        dispatch(completeChat({ chatId, fullResponse }));
    }, [dispatch]);

    const setErrorForChat = useCallback((chatId: string, error: string) => {
        dispatch(setError({ chatId, error }));
    }, [dispatch]);

    return {
        chats: aiChatState.chats,
        activeChatId: aiChatState.activeChatId,
        createNewChat,
        sendMessage,
        setActiveChatId,
        deleteChat,
        markChatComplete,
        setErrorForChat,
        userPreferences, // Exposing user preferences if needed in components
    };
}