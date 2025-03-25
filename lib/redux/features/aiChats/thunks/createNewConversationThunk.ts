// conversationThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { 
  setActiveConversation,
  clearConversation,
  ConversationState,
} from '../conversationSlice';
import { startNewMessage } from './startNewMessageThunk';
import { ChatMode } from '../conversationSlice';
import { NewMessageState } from '../newMessageSlice';

interface CreateNewConversationArgs {
  userId: string;
  label?: string;
  currentModel?: string;
  currentMode?: ChatMode;
}

interface Message {
  id: string;
  conversationId: string;
  role: string;
  content?: string;
  displayOrder?: number;
  systemOrder?: number;
}


export const createNewConversation = createAsyncThunk<
  { conversation: ConversationState; newMessage: Partial<NewMessageState> },
  CreateNewConversationArgs,
  { state: { conversation: ConversationState; newMessage: NewMessageState } }
>(
  'conversation/createNewConversation',
  async (args, { dispatch, getState }) => {
    const { userId, label, currentModel, currentMode } = args;
    const newId = uuidv4();

    dispatch(clearConversation());

    // Bulk update with defaults and provided args
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

    return {
      conversation: getState().conversation,
      newMessage: newMessage.payload,
    };
  }
);

