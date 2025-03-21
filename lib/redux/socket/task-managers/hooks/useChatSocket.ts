// import { useState, useRef, useEffect, useCallback } from "react";
// import { ChatTaskManager } from "@/lib/redux/socket/task-managers/ChatTaskManager";
// import { Message, ChatMode } from "@/types/chat/chat.types";

// interface UseChatSocketProps {
//     conversationId: string;
//     onResponse?: (response: string) => void;
//     onError?: (error: string) => void;
// }

// export function useChatSocket({ conversationId, onResponse, onError }: UseChatSocketProps) {
//     const [streamingResponse, setStreamingResponse] = useState<string>("");
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState<boolean>(false);
//     const [isStreaming, setIsStreaming] = useState<boolean>(false);
//     const taskManager = useRef(new ChatTaskManager()).current;
//     const cleanupRef = useRef<(() => void) | null>(null);
//     const onResponseRef = useRef(onResponse);
//     const onErrorRef = useRef(onError);

//     useEffect(() => {
//         onResponseRef.current = onResponse;
//         onErrorRef.current = onError;
//     }, [onResponse, onError]);

//     useEffect(() => {
//         return () => {
//             if (cleanupRef.current) {
//                 cleanupRef.current();
//             }
//         };
//     }, []);

//     const handleUpdate = useCallback((_, fullText: string) => {
//         setStreamingResponse(fullText);
//         onResponseRef.current?.(fullText);
//     }, []);

//     const handleError = useCallback((errorMsg: string) => {
//         setError(errorMsg);
//         onErrorRef.current?.(errorMsg);
//         setIsStreaming(false);
//     }, []);

//     const handleComplete = useCallback(() => {
//         setIsStreaming(false);
//     }, []);

//     const submitSocketMessage = useCallback(
//         async (message: Message, modelOverride?: string, modeOverride?: ChatMode) => {
//             if (message.content.trim().length === 0) {
//                 return;
//             }

//             if (cleanupRef.current) {
//                 cleanupRef.current();
//                 cleanupRef.current = null;
//             }

//             setIsLoading(true);
//             setStreamingResponse("");
//             setError(null);
//             setIsStreaming(true);

//             try {
//                 const [cleanup, getCurrentResponse] = taskManager.streamMessage(conversationId, message, {
//                     overrides: {
//                         modelOverride,
//                         modeOverride,
//                     },
//                     onUpdate: handleUpdate,
//                     onError: handleError,
//                     onComplete: handleComplete,
//                 });

//                 cleanupRef.current = cleanup;
//             } catch (err) {
//                 const errorMessage = err instanceof Error ? err.message : "An error occurred";
//                 setError(errorMessage);
//                 onErrorRef.current?.(errorMessage);
//                 setIsStreaming(false);
//             } finally {
//                 setIsLoading(false);
//             }

//             return () => {
//                 if (cleanupRef.current) {
//                     cleanupRef.current();
//                     cleanupRef.current = null;
//                     setIsStreaming(false);
//                 }
//             };
//         },
//         [conversationId, handleUpdate, handleError, handleComplete, taskManager]
//     );

//     const cancelStream = useCallback(() => {
//         if (cleanupRef.current) {
//             cleanupRef.current();
//             cleanupRef.current = null;
//             setIsStreaming(false);
//         }
//     }, []);

//     return {
//         submitSocketMessage,
//         streamingResponse,
//         error,
//         isLoading,
//         isStreaming,
//         cancelStream,
//     };
// }

// export type UseChatSocketResult = ReturnType<typeof useChatSocket>;
