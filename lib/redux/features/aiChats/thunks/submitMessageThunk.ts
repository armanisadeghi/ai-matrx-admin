// submitMessageThunk.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { NewMessageState, setStatus } from '../newMessageSlice';
import { startNewMessage } from './startNewMessageThunk';

// Placeholder validation function
const validateMessage = (message: NewMessageState): boolean => {
  // Add your validation logic here
  // For now, just checking if content exists
  return !!message.content.trim();
};

// Placeholder for submitDynamicEvent
const submitDynamicEvent = async (
  message: NewMessageState,
  service: string,
  task: string
): Promise<void> => {
  // Simulate API call
  return new Promise((resolve) => setTimeout(resolve, 1000));
};

export const submitMessage = createAsyncThunk<
  { success: boolean; message?: string },
  void,
  { state: { newMessage: NewMessageState } }
>(
  'newMessage/submitMessage',
  async (_, { dispatch, getState }) => {
    try {
      const currentMessage = getState().newMessage;

      // Validate message
      if (!validateMessage(currentMessage)) {
        dispatch(setStatus('error'));
        return { success: false, message: 'Message validation failed' };
      }

      // Submit the message
      await submitDynamicEvent(currentMessage, 'chat_service', 'ai_chat');

      // Trigger new message creation without awaiting
      dispatch(startNewMessage({
        conversationId: currentMessage.conversationId,
        displayOrder: currentMessage.displayOrder + 1,
        systemOrder: currentMessage.systemOrder + 1,
      }));

      return { success: true };
    } catch (error) {
      dispatch(setStatus('error'));
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Submission failed' 
      };
    }
  }
);