// File: lib/redux/selectors/aiChatSelectors.ts

import { RootState } from '../store';

export const selectAllChats = (state: RootState) => state.aiChat.chats;

export const selectActiveChatId = (state: RootState) => state.aiChat.activeChatId;

export const selectActiveChat = (state: RootState) =>
    state.aiChat.activeChatId ? state.aiChat.chats[state.aiChat.activeChatId] : null;

export const selectChatById = (state: RootState, chatId: string) => state.aiChat.chats[chatId];

export const selectChatsByUserId = (state: RootState, userId: string) =>
    Object.values(state.aiChat.chats).filter(chat => chat.userId === userId);

export const selectChatsByModule = (state: RootState, module: string) =>
    Object.values(state.aiChat.chats).filter(chat => chat.module === module);

export const selectChatsByJob = (state: RootState, job: string) =>
    Object.values(state.aiChat.chats).filter(chat => chat.job === job);

export const selectVisibleMessagesForChat = (state: RootState, chatId: string) => {
    const chat = state.aiChat.chats[chatId];
    return chat ? chat.messages.filter(message => message.isVisibleToUser) : [];
};

export const selectAllVisibleMessagesForUser = (state: RootState, userId: string) => {
    const userChats = selectChatsByUserId(state, userId);
    return userChats.flatMap(chat => chat.messages.filter(message => message.isVisibleToUser));
};

export const selectVisibleMessagesForModule = (state: RootState, module: string) => {
    const moduleChats = selectChatsByModule(state, module);
    return moduleChats.flatMap(chat => chat.messages.filter(message => message.isVisibleToUser));
};

export const selectVisibleMessagesForJob = (state: RootState, job: string) => {
    const jobChats = selectChatsByJob(state, job);
    return jobChats.flatMap(chat => chat.messages.filter(message => message.isVisibleToUser));
};

export const selectVisibleMessagesForActiveChat = (state: RootState) => {
    const activeChat = selectActiveChat(state);
    return activeChat ? activeChat.messages.filter(message => message.isVisibleToUser) : [];
};
