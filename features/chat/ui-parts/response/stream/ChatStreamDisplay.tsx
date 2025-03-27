"use client";
import React, { memo, useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { cn } from "@/styles/themes/utils";
import StreamingCode from "@/features/chat/ui-parts/response/stream/StreamingCode";
import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";
import StreamingTable from "@/features/chat/ui-parts/response/stream/StreamingTable";
import { SocketManager } from "@/lib/redux/socket/manager";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
import { useAppDispatch } from "@/lib/redux";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

const components = {
    p: ({ children, ...props }: any) => (
        <p className="font-sans tracking-wide leading-relaxed text-md mb-2" {...props}>
            {children}
        </p>
    ),
    ul: ({ ...props }) => <ul className="list-disc pl-5 ml-3 mb-3 leading-relaxed text-md" {...props} />,
    ol: ({ ...props }) => <ol className="list-decimal pl-5 ml-3 mb-3 leading-relaxed text-md" {...props} />,
    li: ({ children, ...props }: any) => (
        <li className="mb-1 text-md" {...props}>
            {children}
        </li>
    ),
    a: ({ ...props }) => <a className="text-blue-500 underline font-medium text-md" {...props} />,
    h1: ({ ...props }) => <h1 className="text-xl font-bold mb-3 font-heading" {...props} />,
    h2: ({ ...props }) => <h2 className="text-xl font-medium mb-2 font-heading" {...props} />,
    h3: ({ ...props }) => <h3 className="text-lg font-medium mb-2 font-heading" {...props} />,
    h4: ({ ...props }) => <h4 className="text-md font-medium mb-1 font-heading" {...props} />,
    code: ({ inline, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1] : "";

        if (!inline && language) {
            return <StreamingCode code={String(children).replace(/\n$/, "")} language={language} fontSize={16} className="my-3" />;
        }

        return (
            <code
                className={cn(
                    "px-1.5 py-0.5 rounded font-mono text-sm font-medium",
                    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                    className
                )}
                {...props}
            >
                {children}
            </code>
        );
    },
    pre: ({ children, ...props }) => <pre className="my-3" {...props}>{children}</pre>,
    table: ({ node, ...props }: any) => <StreamingTable data={props.tableData} />,
};

interface ChatStreamDisplayProps {
    eventName: string;
    className?: string;
}

const ChatStreamDisplay: React.FC<ChatStreamDisplayProps> = memo(({ eventName, className }) => {
    const dispatch = useAppDispatch();
    const [content, setContent] = useState<string>("");
    const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");
    const socketManager = useMemo(() => SocketManager.getInstance(), []);
    const chatActions = getChatActionsWithThunks();

    const containerStyles = useMemo(
        () =>
            cn(
                "font-sans text-md antialiased leading-relaxed tracking-wide",
                "block p-3 rounded-lg w-full bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
                className
            ),
        [className]
    );

    const tableData = parseMarkdownTable(content);
    const componentsWithTable = ({
        ...components,
        table: () => (tableData ? <StreamingTable data={tableData} /> : null),
    });

    useEffect(() => {
        let unsubscribe: () => void;
        let isMounted = true;
    
        const setupSocket = async () => {
            try {
                await socketManager.connect();
                const socket = await socketManager.getSocket();
    
                if (!socket || !isMounted) {
                    if (isMounted) {
                        setConnectionStatus("error");
                        setContent("Error: Unable to connect to streaming service");
                    }
                    return;
                }
    
                setConnectionStatus("connected");
    
                unsubscribe = socketManager.subscribeToEvent(eventName, (data: any) => {
                    const dataContent = data?.data || "";
                    const newContent = typeof dataContent === "string" 
                        ? dataContent 
                        : JSON.stringify(dataContent);
                    setContent((prev) => prev + newContent);

                
                    const isEnd = data?.end === true || data?.end === "true" || data?.end === "True";
                    if (isEnd) {
                        console.log("[CHAT STREAM DISPLAY] Stream ended");
                        dispatch(chatActions.setIsNotStreaming());
                        dispatch(chatActions.setSocketEventName({ eventName: "STREAM COMPLETE" }));
                    }

                    if (typeof dataContent === "object" && dataContent !== null) {
                        console.log("[CHAT STREAM DISPLAY] Nested object in data.data:", dataContent);
                    }
                });
            } catch (error) {
                console.error("[CHAT STREAM DISPLAY] Socket setup failed:", error);
                if (isMounted) {
                    setConnectionStatus("error");
                    setContent("Error: Failed to initialize streaming");
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
    }, [eventName, socketManager]);

    const renderContent = () => {
        switch (connectionStatus) {
            case "connecting":
                return;
            case "error":
                return (
                    <div className="text-red-500">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentsWithTable}>
                            {content}
                        </ReactMarkdown>
                    </div>
                );
            case "connected":
                return (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentsWithTable}>
                        {content}
                    </ReactMarkdown>
                );
        }
    };

    return (
        <div className="mb-3 w-full text-left">
            <div className={containerStyles}>
                <div className="text-md leading-relaxed tracking-wide">{renderContent()}</div>
            </div>
        </div>
    );
});

ChatStreamDisplay.displayName = "ChatStreamDisplay";

export default ChatStreamDisplay;