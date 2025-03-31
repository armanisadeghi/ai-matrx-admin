// "use client";

// import React, { useEffect, useMemo, useState, useRef } from "react";
// import UserMessage from "@/features/chat/ui-parts/response/UserMessage";
// import AssistantMessage from "@/features/chat/components/response/assistant-message/AssistantMessage";
// import { useFetchConversationMessages } from "./useFetchConversationMessages";
// import { NewChatResult } from "@/hooks/ai/chat/new/useChat";
// import { SocketManager } from "@/lib/redux/socket/manager";
// import { createConversationSelectors } from "@/lib/redux/entity/selectors";
// import { useAppSelector } from "@/lib/redux";

// const DEBUG = false;

// export type localMessage = {
//     id: string;
//     conversationId: string;
//     role: any;
//     content: string;
//     type: any;
//     displayOrder: number;
//     systemOrder: number;
//     metadata?: any;
//     userId?: string;
//     isPublic?: boolean;
//     matrxRecordId?: string;
// };

// const UserMessageItem = React.memo(
//     ({ message, onScrollToBottom }: { message: localMessage; onScrollToBottom: () => void }) => (
//         <UserMessage key={message.id} message={message} onScrollToBottom={onScrollToBottom} />
//     )
// );
// UserMessageItem.displayName = "UserMessageItem";

// const AssistantMessageItem = React.memo(
//     ({ 
//         message, 
//         content, 
//         isStreamActive, 
//         onScrollToBottom 
//     }: { 
//         message?: localMessage; 
//         content: string; 
//         isStreamActive: boolean; 
//         onScrollToBottom: () => void 
//     }) => (
//         <AssistantMessage 
//             key={message?.id || "stream"} 
//             content={content} 
//             isStreamActive={isStreamActive} 
//             onScrollToBottom={onScrollToBottom} 
//         />
//     )
// );
// AssistantMessageItem.displayName = "AssistantMessageItem";

// const SmartResponseColumn: React.FC = () => {
//     const selectors = createConversationSelectors;
//     const conversation = useAppSelector(selectors.selectActiveRecord);
//     const conversationId = conversation?.id;
//     const eventName = useAppSelector(selectors.selectSocketEventName);

//     console.log("eventName", eventName);
//     const customData = useAppSelector(selectors.selectCustomData);
//     const isNewChat = useMemo(() => customData?.isNewChat !== false, [customData?.isNewChat]);

//     const [streamContent, setStreamContent] = useState<string>("");
//     const [isStreaming, setIsStreaming] = useState<boolean>(false);
//     const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");
//     const streamEndedRef = useRef<boolean>(false);
//     const socketManager = useMemo(() => SocketManager.getInstance(), []);

//     const { 
//         messagesToDisplay, 
//         isLastMessageAssistant, 
//         nextDisplayOrder, 
//         messageCount,
//         isLoading 
//     } = useFetchConversationMessages({
//         conversationId,
//         eventName,
//         fetchOnStreamEnd: true,
//         isNewChat,
//     });
//     // Get all messages except possibly the last assistant message that's being streamed
//     const stableMessages = useMemo(() => {
//         // Only filter out the last assistant message if:
//         // 1. We are actively streaming OR we just finished streaming (streamEndedRef.current)
//         // 2. AND the last message is from the assistant (meaning the database has it now)
        
//         if ((isStreaming || streamEndedRef.current) && isLastMessageAssistant) {
//             return messagesToDisplay.slice(0, -1);
//         }
        
//         // In all other cases (initial load, viewing history, etc.), show all messages
//         return messagesToDisplay;
//     }, [messagesToDisplay, isStreaming, isLastMessageAssistant, streamEndedRef.current]);

//     // Get the last assistant message from the database if it exists
//     const lastAssistantMessage = useMemo(() => {
//         if (isLastMessageAssistant && messagesToDisplay.length > 0) {
//             return messagesToDisplay[messagesToDisplay.length - 1];
//         }
//         return null;
//     }, [messagesToDisplay, isLastMessageAssistant]);

//     // Determine if we should show the streamed content or the database content
//     const shouldShowStream = useMemo(() => {
//         // Only show the stream if:
//         // 1. We're actively streaming
//         // 2. AND EITHER:
//         //    a. The database doesn't have the message yet (!isLastMessageAssistant), OR
//         //    b. Our stream content is more complete than what's in the database
        
//         // Added safety check for lastAssistantMessage content
//         const dbContentLength = lastAssistantMessage?.content?.length || 0;
        
//         return isStreaming && (!isLastMessageAssistant || streamContent.length > dbContentLength);
//     }, [isStreaming, isLastMessageAssistant, streamContent, lastAssistantMessage]);

//     useEffect(() => {
//         let unsubscribe: () => void;
//         let isMounted = true;
        
//         // Only reset streamEndedRef when eventName changes, indicating a new message
//         if (eventName) {
//             streamEndedRef.current = false;
//             setIsStreaming(true);
//         }
    
//         const setupSocket = async () => {
//             if (!eventName) {
//                 // No event name means we're just loading history, not streaming
//                 setIsStreaming(false);
//                 return;
//             }
            
//             try {
//                 await socketManager.connect();
//                 const socket = await socketManager.getSocket();
    
//                 if (!socket || !isMounted) {
//                     if (isMounted) {
//                         setConnectionStatus("error");
//                         setStreamContent("Error: Unable to connect to streaming service");
//                         setIsStreaming(false);
//                     }
//                     return;
//                 }
    
//                 setConnectionStatus("connected");
    
//                 unsubscribe = socketManager.subscribeToEvent(eventName, (data: any) => {
//                     // Since data is always an object, check the type of data.data
//                     const dataContent = data?.data || "";
                    
//                     if (dataContent === "[DONE]" || dataContent === "{\"type\":\"done\"}") {
//                         if (isMounted) {
//                             streamEndedRef.current = true;
//                             setIsStreaming(false);
//                         }
//                         return;
//                     }
                    
//                     const newContent = typeof dataContent === "string" 
//                         ? dataContent 
//                         : JSON.stringify(dataContent);
                        
//                     if (isMounted) {
//                         setStreamContent((prev) => prev + newContent);
//                     }
                    
//                     // Log for debugging when data.data is an object
//                     if (DEBUG && typeof dataContent === "object" && dataContent !== null) {
//                         console.log("[ChatStreamDisplay] Nested object in data.data:", dataContent);
//                     }
//                 });
//             } catch (error) {
//                 console.error("[ChatStreamDisplay] Socket setup failed:", error);
//                 if (isMounted) {
//                     setConnectionStatus("error");
//                     setStreamContent("Error: Failed to initialize streaming");
//                     setIsStreaming(false);
//                 }
//             }
//         };
    
//         setupSocket();
    
//         return () => {
//             isMounted = false;
//             if (unsubscribe) {
//                 unsubscribe();
//             }
//         };
//     }, [eventName, socketManager]);

//     // Reset stream content when a new message stream starts
//     useEffect(() => {
//         if (isNewChat) {
//             // Always reset for a new chat
//             setStreamContent("");
//             streamEndedRef.current = false;
//         } else if (!isLastMessageAssistant && messageCount > 0) {
//             // User just sent a message (last message is user's), so reset for new stream
//             setStreamContent("");
//             streamEndedRef.current = false;
//         }
//     }, [isNewChat, isLastMessageAssistant, messageCount]);

//     const handleScrollToBottom = () => {
//         console.log("scrolling to bottom");
//         // Implement your scroll logic here
//     };

//     if (DEBUG) {
//         console.log({
//             isStreaming,
//             isLastMessageAssistant,
//             shouldShowStream,
//             messageCount,
//             streamContentLength: streamContent.length,
//             lastMessageContentLength: lastAssistantMessage?.content.length
//         });
//     }

//     return (
//         <div className="w-full px-4 py-6">
//             <div className="max-w-3xl mx-auto space-y-6">
//                 {/* Render all stable messages */}
//                 {stableMessages.map((message) => (
//                     message.role === "user" ? (
//                         <UserMessageItem 
//                             key={message.id} 
//                             message={message} 
//                             onScrollToBottom={handleScrollToBottom} 
//                         />
//                     ) : (
//                         <AssistantMessageItem 
//                             key={message.id}
//                             message={message}
//                             content={message.content}
//                             isStreamActive={false}
//                             onScrollToBottom={handleScrollToBottom}
//                         />
//                     )
//                 ))}
                
//                 {/* Show the streaming content when appropriate */}
//                 {shouldShowStream && (
//                     <AssistantMessageItem
//                         content={streamContent}
//                         isStreamActive={true}
//                         onScrollToBottom={handleScrollToBottom}
//                     />
//                 )}
                
//                 {/* Show the last assistant message from database when appropriate */}
//                 {lastAssistantMessage && !shouldShowStream && (isStreaming || streamEndedRef.current) && (
//                     <AssistantMessageItem
//                         message={lastAssistantMessage}
//                         content={lastAssistantMessage.content}
//                         isStreamActive={false}
//                         onScrollToBottom={handleScrollToBottom}
//                     />
//                 )}
                
//                 {/* Show loading state or error if needed */}
//                 {connectionStatus === "error" && (
//                     <div className="text-red-500 p-2 rounded-md bg-red-50">
//                         Connection error: Unable to connect to the streaming service.
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default SmartResponseColumn;