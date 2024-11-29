// redux/features/aiChats/selectors.ts

import { RootState } from '@/redux/store';
import { createSelector } from '@reduxjs/toolkit';

export const selectActiveChatId = (state: RootState) => state.chats.activeChatId;
export const selectChatSummaries = (state: RootState) => state.chats.chatSummaries;
export const selectIsNewChat = (state: RootState) => state.chats.isNewChat;
export const selectChatTransition = (state: RootState) => state.chats.chatTransition;

export const selectMessagesByChatId = (state: RootState) => state.messages.messagesByChatId;
export const selectMessageFetchStatus = (state: RootState) => state.messages.fetchStatus;

export const selectUser = (state: RootState) => state.user;

export const selectSettings = (state: RootState) => state.settings;

export const selectActiveChat = createSelector(
    [selectActiveChatId, selectChatSummaries],
    (activeChatId, chatSummaries) =>
        chatSummaries.find(chat => chat.chatId === activeChatId) || null
);

export const selectActiveChatMessages = createSelector(
    [selectActiveChatId, selectMessagesByChatId],
    (activeChatId, messagesByChatId) =>
        activeChatId ? messagesByChatId[activeChatId] || [] : []
);

export const selectQuickChatSettings = createSelector(
    [selectSettings],
    (settings) => ({
        submitOnEnter: settings.submitOnEnter,
        aiPreferencesMain: settings.aiPreferencesMain,
        aiPreferencesSecond: settings.aiPreferencesSecond,
        makeSmallTalk: settings.makeSmallTalk,
        quickAnswer: settings.quickAnswer,
        improveQuestions: settings.improveQuestions,
        matrixLevel: settings.matrixLevel,
    })
);

export const selectAIModelSettings = createSelector(
    [selectSettings],
    (settings) => ({
        aiModel: settings.aiModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP,
        frequencyPenalty: settings.frequencyPenalty,
        stopSequence: settings.stopSequence,
    })
);
