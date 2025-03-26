import { v4 as uuidv4 } from "uuid";
import { DEFAULT_CONVERSATION, DEFAULT_FIRST_MESSAGE } from "@/constants/chat";
import { Conversation, Message } from "@/types/chat/chat.types";
import { getEntitySlice } from "@/lib/redux/entity/entitySlice";
import { createAppThunk } from "@/lib/redux/utils";
import { EntityKeys, MatrxRecordId } from "@/types";
import { saveRecordsInOrder } from "@/lib/redux/entity/thunks/createRecordThunk";


interface CreateConversationAndMessagePayload {
    conversationOverrides?: Partial<Conversation>;
    messageOverrides?: Partial<Message>;
    messageContent?: string;
}

interface CreateConversationAndMessageResult {
    conversationId: string;
    messageId: string;
    conversationRecordKey: string;
    messageRecordKey: string;
}

export const createConversationAndMessage = createAppThunk<
    CreateConversationAndMessageResult,
    CreateConversationAndMessagePayload,
    { rejectValue: string }
>(
    "chat/createConversationAndMessage",
    async ({ conversationOverrides = {}, messageOverrides = {}, messageContent = "" }, { dispatch, getState, rejectWithValue }) => {
        try {
            const conversationId = uuidv4();
            const conversationRecordKey = `id:${conversationId}`;
            const conversationTempKey = `new-record-${conversationId}`;

            const messageId = uuidv4();
            const messageRecordKey = `id:${messageId}`;
            const messageTempKey = `new-record-${messageId}`;

            const conversationInitialData: Partial<Conversation> = {
                ...DEFAULT_CONVERSATION,
                id: conversationId,
                ...conversationOverrides,
            };

            const messageInitialData: Partial<Message> = {
                ...DEFAULT_FIRST_MESSAGE,
                id: messageId,
                conversationId: conversationId,
                content: messageContent,
                ...messageOverrides,
            };

            const conversationSlice = getEntitySlice("conversation");
            const messageSlice = getEntitySlice("message");

            dispatch(
                conversationSlice.actions.startRecordCreationWithData({
                    tempId: conversationTempKey,
                    initialData: conversationInitialData,
                })
            );

            dispatch(
                messageSlice.actions.startRecordCreationWithData({
                    tempId: messageTempKey,
                    initialData: messageInitialData,
                })
            );

            return {
                conversationId,
                messageId,
                conversationRecordKey,
                messageRecordKey,
            };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Failed to create conversation and message");
        }
    }
);


interface SaveConversationAndMessagePayload {
    conversationTempId: MatrxRecordId; // e.g., 'new-record-convo123'
    messageTempId: MatrxRecordId;     // e.g., 'new-record-msg456'
  }
  
  interface SaveConversationAndMessageResult {
    conversationCallbackId: string;
    messageCallbackId: string;
  }
  
  export const saveConversationAndMessage = createAppThunk<
    SaveConversationAndMessageResult,
    SaveConversationAndMessagePayload,
    { rejectValue: string }
  >(
    'chat/saveConversationAndMessage',
    async ({ conversationTempId, messageTempId }, { dispatch, rejectWithValue }) => {
      try {
        const payloads = [
          { entityKey: 'conversation' as EntityKeys, matrxRecordId: conversationTempId },
          { entityKey: 'message' as EntityKeys, matrxRecordId: messageTempId },
        ];
  
        const result = await dispatch(saveRecordsInOrder(payloads));
  
        if (saveRecordsInOrder.fulfilled.match(result)) {
          const [conversationResult, messageResult] = result.payload;
          return {
            conversationCallbackId: conversationResult.callbackId,
            messageCallbackId: messageResult.callbackId,
          };
        } else {
          return rejectWithValue(result.payload || 'Failed to save conversation and message');
        }
      } catch (error) {
        return rejectWithValue(
          error instanceof Error ? error.message : 'Failed to save conversation and message'
        );
      }
    }
  );