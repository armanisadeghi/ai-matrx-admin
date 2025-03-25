// startNewMessageThunk.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { 
  setId,
  setConversationId,
  setRole,
  setContent,
  setType,
  setDisplayOrder,
  setSystemOrder,
  setMetadata,
  setIsPublic,
  resetNewMessage,
  NewMessageState 
} from '../newMessageSlice';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageType = 'text' | 'image' | 'file' | 'mixed' | 'json_object' | 'base64_image' | 'blob' | 'image_url' | 'tool_result' | 'other';

interface StartNewMessageArgs {
  // Required fields
  displayOrder: number;
  systemOrder: number;
  // Optional fields
  id?: string;
  conversationId?: string;
  role?: MessageRole;
  content?: string;
  type?: MessageType;
  metadata?: Record<string, any>;
  isPublic?: boolean;
}

export const startNewMessage = createAsyncThunk<
  NewMessageState,
  StartNewMessageArgs,
  { state: { newMessage: NewMessageState } }
>(
  'newMessage/startNewMessage',
  async (args, { dispatch, getState }) => {
    const { 
      displayOrder, 
      systemOrder, 
      id, 
      conversationId, 
      role, 
      content, 
      type, 
      metadata, 
      isPublic 
    } = args;

    // Use provided ID or generate new UUID
    const messageId = id || uuidv4();

    // Reset state
    dispatch(resetNewMessage());

    // Set required fields
    dispatch(setDisplayOrder(displayOrder));
    dispatch(setSystemOrder(systemOrder));

    // Set optional fields with defaults if not provided
    dispatch(setId(messageId));
    if (conversationId !== undefined) {
      dispatch(setConversationId(conversationId));
    } else if (!getState().newMessage.conversationId) {
      throw new Error('conversationId must be provided when starting a new message with no existing conversation');
    }
    
    dispatch(setRole(role || 'user'));
    dispatch(setType(type || 'text'));
    dispatch(setIsPublic(isPublic !== undefined ? isPublic : false));
    
    if (content !== undefined) dispatch(setContent(content));
    if (metadata !== undefined) dispatch(setMetadata(metadata));

    return getState().newMessage;
  }
);