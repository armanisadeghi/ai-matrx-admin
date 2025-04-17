"use client";
import React, { memo, useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { cn } from "@/styles/themes/utils";
import StreamingCode from "@/features/chat/components/response/assistant-message/stream/StreamingCode";
import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";
import StreamingTable from "@/features/chat/components/response/assistant-message/stream/StreamingTable";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { parseTaggedContent } from "@/components/mardown-display/chat-markdown/utils/thinking-parser";
import ThinkingVisualization from "@/components/mardown-display/chat-markdown/ThinkingVisualization";
import CodeBlock from "@/components/mardown-display/code/CodeBlock";
import { selectStreamText, selectStreamData, selectIsStreaming, selectStreamEnd } from "@/lib/redux/socket/streamingSlice";
import { RootState } from "@/lib/redux/store";

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
    a: ({ node, ...props }) => <a className="text-blue-500 underline font-medium text-md" {...props} />,
    h1: ({ node, ...props }) => <h1 className="text-xl text-blue-500 font-bold mb-3 font-heading" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-xl text-blue-500 font-medium mb-2 font-heading" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-lg text-blue-500 font-medium mb-2 font-heading" {...props} />,
    h4: ({ node, ...props }) => <h4 className="text-md text-blue-500 font-medium mb-1 font-heading" {...props} />,
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
    pre: ({ children, ...props }) => (
        <pre className="my-3" {...props}>
            {children}
        </pre>
    ),
    // --- TABLE RENDERERS ---
    table: ({ children, ...props }) => (
        <StreamingTable {...props}>{children}</StreamingTable>
    ),
    thead: ({ children, ...props }) => <thead {...props}>{children}</thead>,
    tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
    th: ({ children, ...props }) => (
        <th className="px-4 py-2 text-left font-semibold text-bold text-gray-900 dark:text-gray-100" {...props}>
            {children}
        </th>
    ),
    td: ({ children, ...props }) => (
        <td className="px-4 py-2" {...props}>
            {children}
        </td>
    ),
};

interface ChatStreamDisplayProps {
    eventName: string;
    className?: string;
}

const ChatStreamDisplay: React.FC<ChatStreamDisplayProps> = memo(({ eventName, className }) => {
    const dispatch = useAppDispatch();
    const [content, setContent] = useState<string>("");
    const chatActions = getChatActionsWithThunks();
    const streamText = useAppSelector((state: RootState) => selectStreamText(state, eventName));
    const streamData = useAppSelector((state: RootState) => selectStreamData(state, eventName));
    const isStreaming = useAppSelector((state: RootState) => selectIsStreaming(state, eventName));
    const isStreamEnded = useAppSelector((state: RootState) => selectStreamEnd(state, eventName));

    const handleNewTextContent = (textContent: string) => {
        setContent(textContent);
    };

    const handleStreamEnd = () => {
        console.log("[CHAT STREAM DISPLAY] Stream ended");
        dispatch(chatActions.setIsNotStreaming());
        dispatch(chatActions.fetchMessagesForActiveConversation());
    };

    const handleNewDataContent = (dataContent: any) => {
        const isEnd = dataContent?.end === true || dataContent?.end === "true" || dataContent?.end === "True";
        if (isEnd) {
            dispatch(chatActions.setIsNotStreaming());
            dispatch(chatActions.fetchMessagesForActiveConversation());
        }
    };

    useEffect(() => {
        handleNewTextContent(streamText);
    }, [streamText]);

    useEffect(() => {
        if (streamData) {
            handleNewDataContent(streamData);
        }
    }, [streamData]);

    useEffect(() => {
        if (isStreamEnded) {
            handleStreamEnd();
        }
    }, [isStreamEnded]);

    const containerStyles = useMemo(
        () =>
            cn(
                "font-sans text-md antialiased leading-relaxed tracking-wide",
                "block p-3 rounded-lg w-full bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
                className
            ),
        [className]
    );

    const parsedContent = useMemo(() => {
        // You can keep this if you use it elsewhere, but it's not needed for table rendering anymore
        const tableData = parseMarkdownTable(content);
        const contentSegments = parseTaggedContent(content);
        return { tableData, contentSegments };
    }, [content]);

    const renderContent = () => {
        if (!isStreaming) {
            return null;
        }

        return parsedContent.contentSegments.map((segment, index) => (
            <React.Fragment key={index}>
                {segment.isThinking ? (
                    <ThinkingVisualization thinkingText={segment.content} showThinking={true} />
                ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                        {segment.content}
                    </ReactMarkdown>
                )}
            </React.Fragment>
        ));
    };

    if (content.length < 2) return null;

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