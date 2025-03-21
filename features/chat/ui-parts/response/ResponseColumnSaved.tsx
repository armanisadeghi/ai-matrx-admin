// import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
// import UserMessage from "@/features/chat/ui-parts/response/UserMessage";
// import AssistantMessage from "@/features/chat/ui-parts/response/AssistantMessage";
// import { Message } from "@/types/chat/chat.types";
// import { ConversationWithRoutingResult } from "@/hooks/ai/chat/useConversationWithRouting";
// import { ChevronDown } from "lucide-react"; // Import Lucide icon
// import { useFetchConversationMessages } from "./useFetchConversationMessages";
// import { MessageRecordWithKey } from "@/types";

// interface ResponseColumnProps {
//     chatHook: ConversationWithRoutingResult;
// }

// const MessageItem = React.memo(({ message }: { message: MessageRecordWithKey }) =>
//     message.role === "user" ? (
//         <UserMessage key={message.id} message={message} />
//     ) : (
//         <AssistantMessage key={message.id} content={message.content} isStreamActive={false} />
//     )
// );

// MessageItem.displayName = "MessageItem";

// const ResponseColumn: React.FC<ResponseColumnProps> = ({ chatHook }) => {
//     const { currentMessages, nextDisplayOrder, nextSystemOrder } = useFetchConversationMessages(chatHook.currentConversationId);
    
//     const { chatSocket } = chatHook;
//     const { isStreaming, streamingResponse } = chatSocket;
//     const [persistedMessages, setPersistedMessages] = useState<MessageRecordWithKey[]>([]);
//     const messagesEndRef = useRef<HTMLDivElement>(null);
//     const [showScrollButton, setShowScrollButton] = useState(false);

//     const baseMessages = useMemo(() => currentMessages.filter((m) => m.role === "user" || m.role === "assistant"), [currentMessages]);


//     const streamingMessageKey = useMemo(() => (isStreaming ? `streaming-${Date.now()}` : ""), [isStreaming]);

//     const scrollToBottom = useCallback(() => {
//         messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
//     }, []);

//     // Check if user has scrolled away from bottom
//     useEffect(() => {
//         const handleScroll = () => {
//             const bottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
//             setShowScrollButton(!bottom);
//         };

//         window.addEventListener("scroll", handleScroll);
//         return () => window.removeEventListener("scroll", handleScroll);
//     }, []);

//     // Scroll to bottom when streaming starts or updates
//     useEffect(() => {
//         if (isStreaming) scrollToBottom();
//     }, [isStreaming]);

//     // Scroll to bottom when messages change
//     useEffect(() => {
//         scrollToBottom();
//     }, [baseMessages.length, persistedMessages.length, scrollToBottom]);

//     const persistMessage = useCallback(() => {
//         if (!streamingResponse) return;

//         const streamedMessage: Message = {
//             id: streamingMessageKey,
//             role: "assistant",
//             content: streamingResponse,
//             conversationId: currentMessages[0]?.conversationId ?? "",
//             type: "text",
//             displayOrder: nextDisplayOrder,
//             systemOrder: nextSystemOrder,
//         };

//     }, [streamingResponse, streamingMessageKey, nextDisplayOrder, nextSystemOrder, baseMessages]);

//     useEffect(() => {
//         if (isStreaming) return;
//         persistMessage();
//     }, [isStreaming]);

//     const visibleMessages = useMemo(() => [...baseMessages, ...persistedMessages], [baseMessages, persistedMessages]);

//     return (
//         <div className="w-full px-4 py-6">
//             <div className="max-w-3xl mx-auto space-y-6">
//                 {visibleMessages.map((message) => (
//                     <MessageItem key={message.id} message={message} />
//                 ))}
//                 {isStreaming && streamingResponse && (
//                     <AssistantMessage key={streamingMessageKey} content={streamingResponse} isStreamActive={true} />
//                 )}
//                 <div ref={messagesEndRef} />
//             </div>

//             <div className="relative max-w-3xl mx-auto">
//                 <button
//                     onClick={scrollToBottom}
//                     className="absolute right-0 bottom-[100px] bg-gray-700 hover:bg-gray-800 text-white rounded-full p-2 shadow-md z-10"
//                     style={{ width: "40px", height: "40px", opacity: 0.7 }}
//                     aria-label="Scroll to bottom"
//                 >
//                     <ChevronDown className="w-5 h-5 mx-auto" />
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default ResponseColumn;
