"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import useChatBasics from "@/features/chat/hooks/useChatBasics";
import { useAppDispatch } from "@/lib/redux";
import { saveMessageThunk } from "@/lib/redux/features/aiChats/thunks/entity/createMessageThunk";
import { submitChatFastAPI as createAndSubmitTask } from "@/lib/redux/socket-io/thunks/submitChatFastAPI";

const INFO = true;
const DEBUG = false;
const VERBOSE = false;

interface ExistingChatProps {
    existingConversationId: string;
}

export function useExistingChat({ existingConversationId }: ExistingChatProps) {
    const [firstLoadComplete, setFirstLoadComplete] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const dispatch = useAppDispatch();
    const router = useRouter();

    const { chatActions, conversationId, routeLoadComplete, messageKey } = useChatBasics();

    const handlerCoordinatedFetch = useCallback(() => {
        dispatch(chatActions.coordinateActiveConversationAndMessageFetch(existingConversationId));
        setFirstLoadComplete(true);
    }, [existingConversationId, dispatch, chatActions]);

    useEffect(() => {
        handlerCoordinatedFetch()
    }, []);

    useEffect(() => {
        if (!firstLoadComplete) return;

        if (existingConversationId !== conversationId) {
            console.log(
                "SHOULD NOT SEE THIS!!! --- Check The Code --- USE EXISTING CHAT. Fetching Records Again!. ===== This is probably not good ===="
            );
            dispatch(chatActions.setExternalConversationLoading(true));
            handlerCoordinatedFetch();
        } else {
            dispatch(chatActions.setExternalConversationLoading(false));
        }
    }, [existingConversationId, conversationId, firstLoadComplete]);

    // Additional effect to ensure external loading is cleared when conversation data loads
    useEffect(() => {
        if (firstLoadComplete && conversationId === existingConversationId) {
            dispatch(chatActions.setExternalConversationLoading(false));
        }
    }, [conversationId, existingConversationId, firstLoadComplete, dispatch, chatActions]);

    const submitChatMessage = useCallback(async () => {
        try {
          setIsSubmitting(true);
    
          if (!messageKey) {
            console.error("USE EXISTING CHAT ERROR! submitChatMessage failed:", "Message key was not found");
            return false;
          }
    
          const result = await dispatch(saveMessageThunk({ messageTempId: messageKey })).unwrap();
    
          if (VERBOSE) console.log("🚀 ~ submitChatMessage ~ result:", JSON.stringify(result, null, 2));
    
          if (result && result.success) {
            const message = result.messageData.data;
    
            // Pre-generate taskId and store it in Redux BEFORE dispatch so the
          // streaming UI mounts immediately and shows chunks as they arrive.
          const taskId = uuidv4();
          dispatch(
              chatActions.updateConversationCustomData({
                keyOrId: conversationId,
                customData: { taskId },
              })
          );

          await dispatch(
              createAndSubmitTask({
                service: "chat_service",
                taskName: "ai_chat",
                taskData: {
                  conversation_id: conversationId,
                  message_object: message,
                },
                customTaskId: taskId,
              })
            ).unwrap();
        
            if (DEBUG) console.log("USE EXISTING CHAT: Task created and submitted with taskId:", taskId, "for conversationId:", conversationId);
            return true;
          } else {
            console.error("USE EXISTING CHAT ERROR! submitChatMessage failed:", result);
            return false;
          }
        } catch (error) {
          console.error("USE EXISTING CHAT ERROR! submitChatMessage failed:", error);
          return false;
        } finally {
          setIsSubmitting(false);
        }
      }, [dispatch, chatActions, conversationId, messageKey]);
        
    return {
        submitChatMessage,
        isSubmitting,
        routeLoadComplete,
        chatActions,
        conversationId,
    };
}

export type ExistingChatResult = ReturnType<typeof useExistingChat>;
export default useExistingChat;
