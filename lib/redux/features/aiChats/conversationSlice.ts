// conversationSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createNewConversation, setExistingConversation } from './thunks/conversationThunks';

export type ChatMode = 'general' | 'research' | 'brainstorm' | 'analyze' | 'images' | 'video' | 'code' | 'recipe';
export type Status = 'pending' | 'initializing' | 'initialized' | 'transitioning' | 'submitting' | 'submitted' | 'error';

export interface ConversationState {
  conversationId: string;
  isNew: boolean;
  status: Status;
  userId: string;
  label: string;
  currentModel?: string;
  currentEndpoint?: string;
  currentMode: ChatMode;
  concurrentRecipes: string[];
  brokerValues: Record<string, unknown>;
  availableTools: string[];
  ModAssistantContext: string | null;
  ModUserContext: string | null;
  currentSystemOrder: number;
  currentDisplayOrder: number;
  isFinalMessageAssistant: boolean;
  files: any[];
}

export const initialState: ConversationState = {
  conversationId: '',
  isNew: true,
  status: 'pending',
  userId: '',
  label: 'New Conversation',
  currentModel: 'ee49f6d3-60ec-47b3-a9e3-2b4d6d64dfa9',
  currentEndpoint: undefined,
  currentMode: 'general',
  concurrentRecipes: [],
  brokerValues: {},
  availableTools: [],
  ModAssistantContext: null,
  ModUserContext: null,
  currentSystemOrder: 2,
  currentDisplayOrder: 1,
  isFinalMessageAssistant: false,
  files: [],
};

const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    setConversationId(state, action: PayloadAction<string>) {
      state.conversationId = action.payload;
    },
    setIsNew(state, action: PayloadAction<boolean>) {
      state.isNew = action.payload;
    },
    setStatus(state, action: PayloadAction<Status>) {
      state.status = action.payload;
    },
    setUserId(state, action: PayloadAction<string>) {
      state.userId = action.payload;
    },
    setLabel(state, action: PayloadAction<string>) {
      state.label = action.payload;
    },
    setCurrentModel(state, action: PayloadAction<string | undefined>) {
      state.currentModel = action.payload;
    },
    setCurrentEndpoint(state, action: PayloadAction<string | undefined>) {
      state.currentEndpoint = action.payload;
    },
    setCurrentMode(state, action: PayloadAction<ChatMode>) {
      state.currentMode = action.payload;
    },
    setConcurrentRecipes(state, action: PayloadAction<string[]>) {
      state.concurrentRecipes = action.payload;
    },
    setBrokerValues(state, action: PayloadAction<Record<string, unknown>>) {
      state.brokerValues = action.payload;
    },
    setAvailableTools(state, action: PayloadAction<string[]>) {
      state.availableTools = action.payload;
    },
    setModAssistantContext(state, action: PayloadAction<string | null>) {
      state.ModAssistantContext = action.payload;
    },
    setModUserContext(state, action: PayloadAction<string | null>) {
      state.ModUserContext = action.payload;
    },
    setCurrentSystemOrder(state, action: PayloadAction<number>) {
      state.currentSystemOrder = action.payload;
    },
    setCurrentDisplayOrder(state, action: PayloadAction<number>) {
      state.currentDisplayOrder = action.payload;
    },
    setIsFinalMessageAssistant(state, action: PayloadAction<boolean>) {
      state.isFinalMessageAssistant = action.payload;
    },
    setFiles(state, action: PayloadAction<any[]>) {
      state.files = action.payload;
    },
    setActiveConversation(state, action: PayloadAction<ConversationState>) {
      return { ...state, ...action.payload };
    },
    clearConversation() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createNewConversation.pending, (state) => {
        state.status = 'initializing';
      })
      .addCase(createNewConversation.fulfilled, (state) => {
        state.status = 'initialized';
      })
      .addCase(createNewConversation.rejected, (state) => {
        state.status = 'error';
      })
      .addCase(setExistingConversation.pending, (state) => {
        state.status = 'initializing';
      })
      .addCase(setExistingConversation.fulfilled, (state) => {
        state.status = 'initialized';
      })
      .addCase(setExistingConversation.rejected, (state) => {
        state.status = 'error';
      });
  },
});

export const {
  setConversationId,
  setIsNew,
  setStatus,
  setUserId,
  setLabel,
  setCurrentModel,
  setCurrentEndpoint,
  setCurrentMode,
  setConcurrentRecipes,
  setBrokerValues,
  setAvailableTools,
  setModAssistantContext,
  setModUserContext,
  setCurrentSystemOrder,
  setCurrentDisplayOrder,
  setIsFinalMessageAssistant,
  setFiles,
  setActiveConversation,
  clearConversation,
} = conversationSlice.actions;

export const conversationReducer = conversationSlice.reducer;

// Selectors
export const selectConversationId = (state: { conversation: ConversationState }) => state.conversation.conversationId;
export const selectIsNew = (state: { conversation: ConversationState }) => state.conversation.isNew;
export const selectStatus = (state: { conversation: ConversationState }) => state.conversation.status;
export const selectUserId = (state: { conversation: ConversationState }) => state.conversation.userId;
export const selectLabel = (state: { conversation: ConversationState }) => state.conversation.label;
export const selectCurrentModel = (state: { conversation: ConversationState }) => state.conversation.currentModel;
export const selectCurrentEndpoint = (state: { conversation: ConversationState }) => state.conversation.currentEndpoint;
export const selectCurrentMode = (state: { conversation: ConversationState }) => state.conversation.currentMode;
export const selectConcurrentRecipes = (state: { conversation: ConversationState }) => state.conversation.concurrentRecipes;
export const selectBrokerValues = (state: { conversation: ConversationState }) => state.conversation.brokerValues;
export const selectAvailableTools = (state: { conversation: ConversationState }) => state.conversation.availableTools;
export const selectModAssistantContext = (state: { conversation: ConversationState }) => state.conversation.ModAssistantContext;
export const selectModUserContext = (state: { conversation: ConversationState }) => state.conversation.ModUserContext;
export const selectCurrentSystemOrder = (state: { conversation: ConversationState }) => state.conversation.currentSystemOrder;
export const selectCurrentDisplayOrder = (state: { conversation: ConversationState }) => state.conversation.currentDisplayOrder;
export const selectIsFinalMessageAssistant = (state: { conversation: ConversationState }) => state.conversation.isFinalMessageAssistant;
export const selectFiles = (state: { conversation: ConversationState }) => state.conversation.files;