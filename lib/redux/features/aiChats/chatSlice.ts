import { MessageState } from '@/redux/features/aiChats/messageSlice';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatType, ChatDetailsType, MessageType } from '@/types';
import { fetchUserChats, createChatStartEntry } from '@/utils/supabase/chatDb';
import { v4 as uuidv4 } from 'uuid';


interface ChatState {
    chatSummaries: ChatType[];
    activeChatId: string | null;
    isNewChat: boolean;
    chatTransition: 'idle' | 'new' | 'transition';
    fetchStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: ChatState = {
    chatSummaries: [],
    activeChatId: null,
    isNewChat: false,
    chatTransition: 'idle',
    fetchStatus: 'idle',
};

type RootState = {
    chats: ChatState;
    user: { matrixId: string | null };
    settings: { systemMessage: string };
    messages: MessageState;
};

export const fetchChats = createAsyncThunk<ChatType[], string>(
    'chats/fetchChats',
    async (matrixId: string) => {
        const chats = await fetchUserChats(matrixId);
        return chats;
    }
);

export const startNewChat = createAsyncThunk<
    ChatDetailsType,
    { userMessage: string; chatId: string },
    { state: RootState }
>(
    'chats/startNewChat',
    async ({userMessage, chatId}, {getState, rejectWithValue}) => {
        const state = getState();
        const chatTransition = state.chats.chatTransition;
        const userId = state.user.matrixId;
        const systemMessage = state.settings.systemMessage; // Assuming you have this in your settings

        if (chatTransition !== 'new') {
            return rejectWithValue('Chat transition state is not "NEW"');
        }
        if (userMessage.length === 0) {
            return rejectWithValue('User message is empty');
        }
        if (!userId) {
            return rejectWithValue('User ID not found');
        }

        const systemMessageEntry: MessageType = {
            chatId: chatId,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            index: 0,
            role: 'system',
            text: systemMessage,
        };

        const userMessageEntry: MessageType = {
            chatId: chatId,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            index: 1,
            role: 'user',
            text: userMessage,
        };

        const assistantEntry: MessageType = {
            chatId: chatId,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            index: 2,
            role: 'assistant',
            text: '',
        };

        const initialMessages: MessageType[] = [systemMessageEntry, userMessageEntry, assistantEntry];
        const chatTitle = userMessage.length > 35 ? userMessage.substring(0, 35) + '...' : userMessage;

        const chatStartObject: ChatDetailsType = {
            chatId: chatId,
            chatTitle: chatTitle,
            createdAt: new Date().toISOString(),
            lastEdited: new Date().toISOString(),
            matrixId: userId,
            metadata: {},
            messages: initialMessages,
        };

        try {
            await createChatStartEntry(chatStartObject);
            return chatStartObject;
        }
        catch (error) {
            return rejectWithValue('Failed to create chat start entry');
        }
    }
);

const chatSlice = createSlice({
    name: 'chats',
    initialState,
    reducers: {
        setActiveChatId: (state, action: PayloadAction<string>) => {
            state.activeChatId = action.payload;
            state.isNewChat = false;
        },
        setIsNewChat: (state, action: PayloadAction<boolean>) => {
            state.isNewChat = action.payload;
        },
        setChatTransition: (state, action: PayloadAction<'idle' | 'new' | 'transition'>) => {
            state.chatTransition = action.payload;
        },
        updateChatSummary: (state, action: PayloadAction<ChatType>) => {
            const index = state.chatSummaries.findIndex(chat => chat.chatId === action.payload.chatId);
            if (index !== -1) {
                state.chatSummaries[index] = action.payload;
            }
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchChats.pending, (state) => {
            state.fetchStatus = 'loading';
        }).addCase(fetchChats.fulfilled, (state, action: PayloadAction<ChatType[]>) => {
            state.fetchStatus = 'succeeded';
            state.chatSummaries = action.payload;
        }).addCase(fetchChats.rejected, (state) => {
            state.fetchStatus = 'failed';
        }).addCase(startNewChat.pending, (state) => {
            state.chatTransition = 'new';
        }).addCase(startNewChat.fulfilled, (state, action: PayloadAction<ChatDetailsType>) => {
            state.chatSummaries.unshift(action.payload);
            state.activeChatId = action.payload.chatId;
            state.isNewChat = false;
            state.chatTransition = 'idle';
        }).addCase(startNewChat.rejected, (state, action) => {
            state.chatTransition = 'idle';
            console.error('Failed to start new chat:', action.payload);
        });
    },
});

export const {setActiveChatId, setIsNewChat, setChatTransition, updateChatSummary} = chatSlice.actions;

export default chatSlice.reducer;
