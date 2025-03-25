// conversationThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { 
  setActiveConversation,
  setCurrentDisplayOrder,
  setCurrentSystemOrder,
  setIsFinalMessageAssistant,
  clearConversation,
  ConversationState,
} from '../conversationSlice';
import { startNewMessage } from './startNewMessageThunk';
import { 
  addMessage, 
  clearMessagesForConversation, 
  selectLastDisplayOrder,
  selectLastSystemOrder,
  selectLastMessageRole,
  addMessages
} from '../messagesSlice';
import { ChatMode } from '../conversationSlice';
import { NewMessageState } from '../newMessageSlice';
import { messageSelectors, RootState } from '@/lib/redux';
import { MessageRecordWithKey } from '@/types';

interface CreateNewConversationArgs {
  userId: string;
  label?: string;
  currentModel?: string;
  currentMode?: ChatMode;
}

interface SetExistingConversationArgs {
  conversation: ConversationState;
  messages: MessageRecordWithKey[];
}

export const createNewConversation = createAsyncThunk<
  { conversation: ConversationState; newMessage: Partial<NewMessageState> },
  CreateNewConversationArgs,
  { state: RootState }
>(
  'conversation/createNewConversation',
  async (args, { dispatch, getState }) => {
    const { userId, label, currentModel, currentMode } = args;
    const newId = uuidv4();

    dispatch(clearConversation());
    dispatch(clearMessagesForConversation(newId));

    dispatch(setActiveConversation({
      conversationId: newId,
      isNew: true,
      status: 'initializing',
      userId,
      label: label || 'New Conversation',
      currentModel: currentModel || 'ee49f6d3-60ec-47b3-a9e3-2b4d6d64dfa9',
      currentEndpoint: undefined,
      currentMode: currentMode || 'general',
      concurrentRecipes: [],
      brokerValues: {},
      availableTools: [],
      ModAssistantContext: null,
      ModUserContext: null,
      currentSystemOrder: 2,
      currentDisplayOrder: 1,
      isFinalMessageAssistant: false,
      files: [],
    }));

    const newMessage = await dispatch(startNewMessage({
      conversationId: newId,
      displayOrder: 1,
      systemOrder: 2,
    }));

    dispatch(addMessage(newMessage.payload as MessageRecordWithKey));

    return {
      conversation: getState().conversation,
      newMessage: newMessage.payload,
    };
  }
);

export const setExistingConversation = createAsyncThunk<
  { conversation: ConversationState; newMessage: Partial<NewMessageState> },
  SetExistingConversationArgs,
  { state: RootState }
>(
  'conversation/setExistingConversation',
  async ({ conversation, messages }, { dispatch, getState }) => {
    dispatch(clearConversation());
    dispatch(clearMessagesForConversation(conversation.conversationId));

    dispatch(setActiveConversation({
      ...conversation,
      status: 'initializing',
      files: conversation.files || [],
    }));

    messages.forEach((message) => {
      dispatch(addMessage(message));
    });

    const state = getState();
    const lastDisplayOrder = selectLastDisplayOrder(state, conversation.conversationId);
    const lastSystemOrder = selectLastSystemOrder(state, conversation.conversationId);
    const lastRole = selectLastMessageRole(state, conversation.conversationId);

    dispatch(setCurrentDisplayOrder(lastDisplayOrder + 1));
    dispatch(setCurrentSystemOrder(lastSystemOrder + 1));
    dispatch(setIsFinalMessageAssistant(lastRole === 'assistant'));

    const newMessage = await dispatch(startNewMessage({
      conversationId: conversation.conversationId,
      displayOrder: getState().conversation.currentDisplayOrder,
      systemOrder: getState().conversation.currentSystemOrder,
    }));

    dispatch(addMessage(newMessage.payload as MessageRecordWithKey));

    return {
      conversation: getState().conversation,
      newMessage: newMessage.payload,
    };
  }
);

export const updateExistingConversation = createAsyncThunk<
  { conversation: ConversationState },
  { conversationId: string },
  { state: RootState }
>(
  'conversation/updateExistingConversation',
  async ({ conversationId }, { dispatch, getState }) => {
    // Get the current state
    const state = getState();
    
    // Fetch messages from the entity slice using the selector
    const messages = messageSelectors.selectRecordsByFieldValue(
      state,
      "conversationId",
      conversationId
    ) as MessageRecordWithKey[];

    // Add any new messages using the efficient addMessages action
    dispatch(addMessages(messages));

    // Get the updated state after adding messages
    const updatedState = getState();
    
    // Calculate the latest values based on all messages for this conversation
    const lastDisplayOrder = selectLastDisplayOrder(updatedState, conversationId);
    const lastSystemOrder = selectLastSystemOrder(updatedState, conversationId);
    const lastRole = selectLastMessageRole(updatedState, conversationId);

    // Update conversation metadata
    dispatch(setCurrentDisplayOrder(lastDisplayOrder + 1));
    dispatch(setCurrentSystemOrder(lastSystemOrder + 1));
    dispatch(setIsFinalMessageAssistant(lastRole === 'assistant'));

    // Update the conversation status to indicate it’s been refreshed
    dispatch(setActiveConversation({
      ...updatedState.conversation,
      conversationId,
    }));

    return {
      conversation: getState().conversation,
    };
  }
);

export const updateConversationOrdersWithMessages = createAsyncThunk<
  void,
  { messages: MessageRecordWithKey[] },
  { state: RootState }
>(
  'conversation/updateConversationOrdersWithMessages',
  async ({ messages }, { dispatch }) => {
    const validMessages = messages
      .filter(msg => msg.displayOrder && msg.displayOrder >= 1)
      .filter(msg => ['user', 'assistant'].includes(msg.role))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    if (validMessages.length > 0) {
      const lastMessage = validMessages[validMessages.length - 1];
      dispatch(setCurrentDisplayOrder((lastMessage.displayOrder || 0) + 1));
      dispatch(setCurrentSystemOrder((lastMessage.systemOrder || 0) + 1));
      dispatch(setIsFinalMessageAssistant(lastMessage.role === 'assistant'));
    } else {
      dispatch(setCurrentDisplayOrder(1));
      dispatch(setCurrentSystemOrder(2));
      dispatch(setIsFinalMessageAssistant(false));
    }
  }
);

export const recalculateConversationOrders = createAsyncThunk<
  void,
  void,
  { state: RootState }
>(
  'conversation/recalculateConversationOrders',
  async (_, { dispatch, getState }) => {
    const state = getState();
    const currentConversationId = state.conversation.conversationId;

    const lastDisplayOrder = selectLastDisplayOrder(state, currentConversationId);
    const lastSystemOrder = selectLastSystemOrder(state, currentConversationId);
    const lastRole = selectLastMessageRole(state, currentConversationId);

    dispatch(setCurrentDisplayOrder(lastDisplayOrder + 1));
    dispatch(setCurrentSystemOrder(lastSystemOrder + 1));
    dispatch(setIsFinalMessageAssistant(lastRole === 'assistant'));
  }
);