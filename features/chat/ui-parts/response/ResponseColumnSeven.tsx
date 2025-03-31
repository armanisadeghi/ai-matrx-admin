// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import UserMessage from "@/features/chat/ui-parts/response/UserMessage";
// import AssistantMessage from "@/features/chat/components/response/assistant-message/AssistantMessage";
// import useChatBasics from "@/features/chat/hooks/useChatBasics";
// import { useSelector } from "react-redux";
// import {
//     selectChatMessages,
//     addMessage,
//     updateMessageContent,
//     ChatMessage,
//     addInitialMessages,
//     appendMessageContent,
// } from "@/lib/redux/features/aiChats/chatDisplaySlice";
// import { SocketManager } from "@/lib/redux/socket/manager";
// import { useAppDispatch } from "@/lib/redux";
// import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";

// const MessageItem = React.memo(({ message }: { message: ChatMessage }) => {
//     const onScrollToBottom = () => console.log("scrolling to bottom");

//     return message.role === "user" ? (
//         <UserMessage
//             key={message.id || message.tempId}
//             message={{ ...message, id: message.id || message.tempId }}
//             onScrollToBottom={onScrollToBottom}
//         />
//     ) : (
//         <AssistantMessage
//             key={message.id || message.tempId}
//             content={message.content}
//             isStreamActive={false}
//             onScrollToBottom={onScrollToBottom}
//         />
//     );
// });

// MessageItem.displayName = "MessageItem";

// const ResponseColumnSeven: React.FC = () => {
//     const { chatSelectors, eventName } = useChatBasics();

//     const messages = useSelector(selectChatMessages);
//     const dispatch = useAppDispatch();
//     const socketManager = useMemo(() => SocketManager.getInstance(), []);
//     const initialMessages = useSelector(chatSelectors.messageRelationFilteredRecords);
//     const isStreaming = useSelector(chatSelectors.isStreaming);
//     const [newMessageId, setNewMessageId] = useState<string | null>(null);
//     const chatActions = getChatActionsWithThunks();

//     // Load initial messages
//     useEffect(() => {
//         if (!initialMessages?.length) return;
//         const simplifiedMessages: ChatMessage[] = initialMessages.map((msg) => ({
//             id: msg.id,
//             role: msg.role as "user" | "assistant",
//             content: msg.content,
//         }));
//         dispatch(addInitialMessages(simplifiedMessages));
//     }, [initialMessages, dispatch]);

//     useEffect(() => {
//         if (!eventName || eventName == "") return;
//         const messageCount = messages.length || 0;
//         const id = `message-${(messageCount + 1).toString().padStart(2, "0")}`;
//         setNewMessageId(id);
//         // Add single streaming message
//         dispatch(
//             addMessage({
//                 tempId: id,
//                 role: "assistant",
//                 content: "",
//             })
//         );
//     }, [eventName, messages.length]);

//     // Create streaming message when eventName changes
//     useEffect(() => {
//         if (!eventName) return;

//         let unsubscribe: () => void;
//         let isMounted = true;

//         const setupSocket = async () => {
//             try {
//                 await socketManager.connect();
//                 const socket = await socketManager.getSocket();

//                 if (!socket || !isMounted) {
//                     return;
//                 }

//                 unsubscribe = socketManager.subscribeToEvent(eventName, (data: any) => {
//                     const dataContent = data?.data || "";
//                     const newContent = typeof dataContent === "string" ? dataContent : JSON.stringify(dataContent);

//                         dispatch(
//                             appendMessageContent({
//                                 id: newMessageId,
//                                 content: newContent,
//                             })
//                         );
//                     const isEnd = data?.end === true || data?.end === "true" || data?.end === "True";
//                     if (isEnd) {
//                         console.log("[CHAT STREAM DISPLAY] Stream ended");
//                         dispatch(chatActions.setIsNotStreaming());
//                         dispatch(chatActions.setSocketEventName({ eventName: "STREAM COMPLETE" }));
//                     }
//                 });
//             } catch (error) {
//                 console.error("[CHAT STREAM DISPLAY] Socket setup failed:", error);
//                 if (isMounted) {
//                     dispatch(
//                         addMessage({
//                             role: "assistant",
//                             content: "Error: Failed to initialize streaming",
//                         })
//                     );
//                 }
//             }
//         };

//         setupSocket();

//         return () => {
//             isMounted = false;
//             if (unsubscribe) unsubscribe();
//         };
//     }, [eventName, socketManager]);

//     return (
//         <div className="w-full px-4 py-6">
//             <div className="max-w-3xl mx-auto space-y-6">
//                 {messages.map((message) => (
//                     <MessageItem key={message.id || message.tempId} message={message} />
//                 ))}
//             </div>
//         </div>
//     );
// };

// export default ResponseColumnSeven;
