"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useChatBasics from "@/features/chat/hooks/useChatBasics";
import { useAppDispatch } from "@/lib/redux";
import { saveMessageThunk } from "@/lib/redux/features/aiChats/thunks/entity/createMessageThunk";
import { createAndSubmitTask } from "@/lib/redux/socket-io";

const INFO = true;
const DEBUG = true;
const VERBOSE = true;

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
    }, [existingConversationId, conversationId]);


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
    
            console.log("🚀 ~ submitChatMessage ~ message:", JSON.stringify(message, null, 2));
            const { taskId } = await dispatch(
              createAndSubmitTask({
                service: "chat_service",
                taskName: "ai_chat",
                taskData: {
                  conversation_id: conversationId,
                  message_object: message,
                },
              })
            ).unwrap();
    
            console.log("🚀 ~ submitChatMessage ~ taskId:", taskId);
            // Store taskId in conversation custom data
            dispatch(
              chatActions.updateConversationCustomData({
                keyOrId: conversationId,
                customData: { taskId },
              })
            );

            console.log("🚀 ~ submitChatMessage ~ updated updateConversationCustomData");
        
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
