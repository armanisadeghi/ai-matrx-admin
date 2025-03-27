"use client";

import React, { useEffect, useMemo, useState } from "react";
import UserMessage from "@/features/chat/ui-parts/response/UserMessage";
import AssistantMessage from "@/features/chat/ui-parts/response/AssistantMessage";
import useChatBasics from "@/features/chat/hooks/useNewChatBasics";
import { useDispatch, useSelector } from "react-redux";
import { 
  selectChatMessages, 
  addMessage, 
  updateMessageContent, 
  ChatMessage,
  addInitialMessages 
} from "@/lib/redux/features/aiChats/chatDisplaySlice";
import { SocketManager } from "@/lib/redux/socket/manager";
import { useAppDispatch } from "@/lib/redux";

const MessageItem = React.memo(({ message, index }: { message: ChatMessage; index: number }) => {
  const onScrollToBottom = () => console.log("scrolling to bottom");

  return message.role === "user" ? (
    <UserMessage
      key={message.id || message.tempId || index}
      message={{ ...message, id: message.id || message.tempId || `${index}` }}
      onScrollToBottom={onScrollToBottom}
    />
  ) : (
    <AssistantMessage
      key={message.id || message.tempId || index}
      content={message.content}
      isStreamActive={false}
      onScrollToBottom={onScrollToBottom}
    />
  );
});

MessageItem.displayName = "MessageItem";

const ResponseColumn: React.FC = () => {
  const { 
    chatSelectors,
    eventName 
  } = useChatBasics();

  const messages = useSelector(selectChatMessages);
  const dispatch = useAppDispatch();
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const socketManager = useMemo(() => SocketManager.getInstance(), []);

  // Load initial messages from your existing chatSelectors
  const initialMessages = useSelector(chatSelectors.messageRelationFilteredRecords);
  const isStreaming = useSelector(chatSelectors.isStreaming);

  // Load initial messages when they change
  useEffect(() => {
    const simplifiedMessages: ChatMessage[] = initialMessages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
    dispatch(addInitialMessages(simplifiedMessages));
  }, [initialMessages, dispatch]);

  // Handle socket streaming
  useEffect(() => {
    let unsubscribe: () => void;
    let isMounted = true;
    let currentStreamId: string | null = null;

    const setupSocket = async () => {
      try {
        await socketManager.connect();
        const socket = await socketManager.getSocket();

        if (!socket || !isMounted) {
          if (isMounted) {
            setConnectionStatus("error");
            dispatch(
              addMessage({
                role: "assistant",
                content: "Error: Unable to connect to streaming service",
                tempId: `error-${Date.now()}`,
              })
            );
          }
          return;
        }

        setConnectionStatus("connected");

        // Only start new stream message when streaming begins
        if (isStreaming) {
          currentStreamId = `stream-${Date.now()}`;
          dispatch(
            addMessage({
              tempId: currentStreamId,
              role: "assistant",
              content: "",
            })
          );
        }

        unsubscribe = socketManager.subscribeToEvent(eventName, (data: any) => {
          const dataContent = data?.data || "";
          const newContent = typeof dataContent === "string" ? dataContent : JSON.stringify(dataContent);

          if (currentStreamId && isMounted) {
            const currentMessage = messages.find((m) => m.tempId === currentStreamId);
            dispatch(
              updateMessageContent({
                id: currentStreamId,
                content: currentMessage?.content + newContent,
              })
            );
          }

          const isEnd = data?.end === true || data?.end === "true" || data?.end === "True";
          if (isEnd) {
            console.log("[CHAT STREAM DISPLAY] Stream ended");
            currentStreamId = null;
          }

          if (typeof dataContent === "object" && dataContent !== null) {
            console.log("[CHAT STREAM DISPLAY] Nested object in data.data:", dataContent);
          }
        });
      } catch (error) {
        console.error("[CHAT STREAM DISPLAY] Socket setup failed:", error);
        if (isMounted) {
          setConnectionStatus("error");
          dispatch(
            addMessage({
              role: "assistant",
              content: "Error: Failed to initialize streaming",
              tempId: `error-${Date.now()}`,
            })
          );
        }
      }
    };

    setupSocket();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [eventName, socketManager, dispatch, messages, isStreaming]);

  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message, index) => (
          <MessageItem key={message.id || message.tempId || index} message={message} index={index} />
        ))}
      </div>
    </div>
  );
};

export default ResponseColumn;