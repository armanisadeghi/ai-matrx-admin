// "use client";
// import React, { memo, useState, useEffect, useMemo, useRef } from "react";
// import dynamic from "next/dynamic";
// import remarkGfm from "remark-gfm";
// import { cn } from "@/styles/themes/utils";
// import StreamingCode from "@/features/chat/components/response/assistant-message/stream/StreamingCode";
// import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";
// import StreamingTable from "@/features/chat/components/response/assistant-message/stream/StreamingTable";
// import { SocketManager } from "@/lib/redux/socket/manager";
// import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
// import { useAppDispatch } from "@/lib/redux";
// import { parseTaggedContent } from "@/components/mardown-display/chat-markdown/utils/thinking-parser";
// import ThinkingVisualization from "@/components/mardown-display/chat-markdown/ThinkingVisualization";
// import CodeBlock from "@/components/mardown-display/code/CodeBlock";

// const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

// const components = {
//     p: ({ children, ...props }: any) => (
//         <p className="font-sans tracking-wide leading-relaxed text-md mb-2" {...props}>
//             {children}
//         </p>
//     ),
//     ul: ({ ...props }) => <ul className="list-disc pl-5 ml-3 mb-3 leading-relaxed text-md" {...props} />,
//     ol: ({ ...props }) => <ol className="list-decimal pl-5 ml-3 mb-3 leading-relaxed text-md" {...props} />,
//     li: ({ children, ...props }: any) => (
//         <li className="mb-1 text-md" {...props}>
//             {children}
//         </li>
//     ),
//     a: ({ node, ...props }) => <a className="text-blue-500 underline font-medium text-md" {...props} />,
//     h1: ({ node, ...props }) => <h1 className="text-xl text-blue-500 font-bold mb-3 font-heading" {...props} />,
//     h2: ({ node, ...props }) => <h2 className="text-xl text-blue-500 font-medium mb-2 font-heading" {...props} />,
//     h3: ({ node, ...props }) => <h3 className="text-lg text-blue-500 font-medium mb-2 font-heading" {...props} />,
//     h4: ({ node, ...props }) => <h4 className="text-md text-blue-500 font-medium mb-1 font-heading" {...props} />,
//     code: ({ inline, className, children, ...props }) => {
//         const match = /language-(\w+)/.exec(className || "");
//         const language = match ? match[1] : "";

//         if (!inline && language) {
//             return <StreamingCode code={String(children).replace(/\n$/, "")} language={language} fontSize={16} className="my-3" />;
//         }

//         return (
//             <code
//                 className={cn(
//                     "px-1.5 py-0.5 rounded font-mono text-sm font-medium",
//                     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
//                     className
//                 )}
//                 {...props}
//             >
//                 {children}
//             </code>
//         );
//     },
//     pre: ({ children, ...props }) => (
//         <pre className="my-3" {...props}>
//             {children}
//         </pre>
//     ),
//     table: ({ node, ...props }: any) => <StreamingTable data={props.tableData} />,
// };

// interface ChatStreamDisplayProps {
//     eventName: string;
//     className?: string;
// }

// const ChatStreamDisplay: React.FC<ChatStreamDisplayProps> = memo(({ eventName, className }) => {
//     const dispatch = useAppDispatch();
//     const [content, setContent] = useState<string>("");
//     const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");
//     const socketManager = useMemo(() => SocketManager.getInstance(), []);
//     const chatActions = getChatActionsWithThunks();
//     const latestDataContent = useRef<any>(null);

//     const handleStreamEnd = () => {
//         console.log("[CHAT STREAM DISPLAY] Stream ended");
//         dispatch(chatActions.setIsNotStreaming());
//         dispatch(chatActions.fetchMessagesForActiveConversation());
//     };

//     const handleNewDataContent = (dataContent: any) => {
//         const isEnd = dataContent?.end === true || dataContent?.end === "true" || dataContent?.end === "True";
//         if (isEnd) {
//             console.log("[CHAT STREAM DISPLAY] Stream ended");
//             dispatch(chatActions.setIsNotStreaming());
//             dispatch(chatActions.fetchMessagesForActiveConversation());
//         }
//     };

//     useEffect(() => {
//         console.log("-> ChatStreamDisplay eventName changed:", eventName);
//     }, [eventName]);
    
//     const containerStyles = useMemo(
//         () =>
//             cn(
//                 "font-sans text-md antialiased leading-relaxed tracking-wide",
//                 "block p-3 rounded-lg w-full bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
//                 className
//             ),
//         [className]
//     );
    
//     // Memoize these operations to prevent recalculation on every render
//     const parsedContent = useMemo(() => {
//         const tableData = parseMarkdownTable(content);
//         const contentSegments = parseTaggedContent(content);
//         return { tableData, contentSegments };
//     }, [content]);
    
//     const componentsWithTable = useMemo(
//         () => ({
//             ...components,
//             table: () => {
//                 if (!parsedContent.tableData?.markdown) return null;
//                 return (
//                     <StreamingTable
//                         data={{
//                             headers: parsedContent.tableData.markdown.headers,
//                             rows: parsedContent.tableData.markdown.rows,
//                         }}
//                     />
//                 );
//             },
//         }),
//         [parsedContent.tableData]
//     );
    
//     const handleNewTextContent = (textContent: string) => {
//         setContent((prev) => prev + textContent);
//         latestDataContent.current = textContent;
//     };
    
//     useEffect(() => {
//         let unsubscribe: () => void;
//         let isMounted = true;
        
//         const setupSocket = async () => {
//             console.log("[CHAT STREAM DISPLAY] Setting up socket connection for event:", eventName);
            
//             if (!eventName) {
//                 console.log("[CHAT STREAM DISPLAY] No event name provided, skipping socket setup");
//                 return;
//             }
            
//             try {
//                 // Log the beginning of the connection process
//                 console.log("[CHAT STREAM DISPLAY] Connecting to socket...");
//                 await socketManager.connect();
                
//                 // Log that we're trying to get the socket
//                 console.log("[CHAT STREAM DISPLAY] Getting socket instance...");
//                 const socket = await socketManager.getSocket();
                
//                 if (!socket || !isMounted) {
//                     console.error("[CHAT STREAM DISPLAY] Socket unavailable or component unmounted");
//                     if (isMounted) {
//                         setConnectionStatus("error");
//                         setContent("Error: Unable to connect to streaming service");
//                     }
//                     return;
//                 }
                
//                 console.log(`[CHAT STREAM DISPLAY] Successfully connected, socket ID: ${socket.id}`);
//                 setConnectionStatus("connected");
                
//                 // Log that we're about to subscribe to the event
//                 console.log(`[CHAT STREAM DISPLAY] Subscribing to event: ${eventName}`);
                
//                 // Subscribe to the event and store the unsubscribe function
//                 unsubscribe = socketManager.subscribeToEvent(eventName, (data: any) => {
//                     console.log(`[CHAT STREAM DISPLAY] Received data for event ${eventName}:`, data);
                    
//                     // If it's text content (string)
//                     if (typeof data === "string") {
//                         console.log(`[CHAT STREAM DISPLAY] Processing string data: "${data.substring(0, 50)}${data.length > 50 ? '...' : ''}"`);
//                         handleNewTextContent(data);
//                     }
                    
//                     // If it's an object with data property
//                     const dataContent = data?.data;
//                     if (dataContent !== undefined) {
//                         console.log(`[CHAT STREAM DISPLAY] Processing data content:`, dataContent);
//                         const newContent = typeof dataContent === "string" 
//                             ? dataContent 
//                             : JSON.stringify(dataContent);
                        
//                         setContent((prev) => prev + newContent);
//                         latestDataContent.current = dataContent;
//                     }
                    
//                     // Check if it's an end signal
//                     const isEnd = data?.end === true || data?.end === "true" || data?.end === "True";
//                     if (isEnd) {
//                         console.log("[CHAT STREAM DISPLAY] Stream ended");
//                         dispatch(chatActions.setIsNotStreaming());
//                         dispatch(chatActions.fetchMessagesForActiveConversation());
//                     }
                    
//                     // Log analysis data
//                     if (typeof dataContent === "object" && dataContent !== null) {
//                         console.log("[CHAT STREAM DISPLAY] Analysis data received:", JSON.stringify(dataContent, null, 2));
//                     }
//                 });
                
//                 console.log(`[CHAT STREAM DISPLAY] Successfully subscribed to event: ${eventName}`);
                
//             } catch (error) {
//                 console.error("[CHAT STREAM DISPLAY] Socket setup failed:", error);
//                 if (isMounted) {
//                     setConnectionStatus("error");
//                     setContent("Error: Failed to initialize streaming");
//                 }
//             }
//         };
        
//         setupSocket();
        
//         // Cleanup function
//         return () => {
//             console.log(`[CHAT STREAM DISPLAY] Cleaning up subscription for event: ${eventName}`);
//             isMounted = false;
//             if (unsubscribe) {
//                 console.log(`[CHAT STREAM DISPLAY] Unsubscribing from event: ${eventName}`);
//                 unsubscribe();
//             }
//         };
//     }, [eventName, socketManager, dispatch, chatActions]);
    
//     // Simple content rendering function
//     const renderContent = () => {
//         if (connectionStatus === "connecting") {
//             return null;
//         }
        
//         if (connectionStatus === "error") {
//             return (
//                 <div className="text-red-500">
//                     <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentsWithTable}>
//                         {content}
//                     </ReactMarkdown>
//                 </div>
//             );
//         }
        
//         // Render all content segments
//         return parsedContent.contentSegments.map((segment, index) => (
//             <React.Fragment key={index}>
//                 {segment.isThinking ? (
//                     <ThinkingVisualization thinkingText={segment.content} showThinking={true} />
//                 ) : (
//                     <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentsWithTable}>
//                         {segment.content}
//                     </ReactMarkdown>
//                 )}
//             </React.Fragment>
//         ));
//     };
    
//     // Show debug information in development
//     useEffect(() => {
//         console.log(`[CHAT STREAM DISPLAY] Current state - Event: ${eventName}, Status: ${connectionStatus}, Content length: ${content.length}`);
//     }, [eventName, connectionStatus, content]);
    
//     if (content.length < 2) return null;
    
//     return (
//         <div className="mb-3 w-full text-left">
//             <div className={containerStyles}>
//                 <div className="text-md leading-relaxed tracking-wide">{renderContent()}</div>
//             </div>
//         </div>
//     );
// });

// ChatStreamDisplay.displayName = "ChatStreamDisplay";
// export default ChatStreamDisplay;
