"use client";
import React, { memo, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { cn } from "@/styles/themes/utils";
import { parseMarkdownTable } from "@/components/mardown-display/markdown-classification/processors/bock-processors/parse-markdown-table";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { parseTaggedContent } from "@/components/mardown-display/markdown-classification/processors/utils/thinking-parser";
import ThinkingVisualization from "@/components/mardown-display/chat-markdown/ThinkingVisualization";
import QuestionnaireLoadingVisualization from "@/components/mardown-display/chat-markdown/QuestionnaireLoadingVisualization";
import { RootState } from "@/lib/redux/store";
import ControlledLoadingIndicator from "@/features/chat/components/response/chat-loading/ControlledLoadingIndicator";
import { createChatSelectors } from "@/lib/redux/entity/custom-selectors/chatSelectors";
import {
    selectTaskFirstListenerId,
    selectTaskStreamingById,
    createTaskResponseSelectors,
} from "@/lib/redux/socket-io";
import markdownComponents from "./markdownComponents";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

interface ChatStreamDisplayProps {
    taskId: string;
    className?: string;
}

const ChatStreamDisplay: React.FC<ChatStreamDisplayProps> = memo(({ taskId, className }) => {
    const dispatch = useAppDispatch();
    const chatActions = getChatActionsWithThunks();
    const chatSelectors = createChatSelectors();
    const responseSelectors = useMemo(() => createTaskResponseSelectors(taskId), [taskId]);

    const content = useAppSelector(responseSelectors.selectText);
    const streamData = useAppSelector(responseSelectors.selectData);
    const isStreamEnded = useAppSelector(responseSelectors.selectEnded);
    const streamError = useAppSelector(responseSelectors.selectErrors);

    const isStreaming = useAppSelector((state: RootState) => selectTaskStreamingById(state, taskId));
    const hasListenerId = useAppSelector((state: RootState) => selectTaskFirstListenerId(state, taskId));

    const settings = useAppSelector(chatSelectors.activeMessageSettings);
    const shouldShowLoader = useAppSelector(chatSelectors.shouldShowLoader);

    const handleStreamEnd = () => {
        console.log("===> [CHAT STREAM DISPLAY] Stream ended");
        dispatch(chatActions.setIsNotStreaming());
        dispatch(chatActions.updateMessageStatus({ status: "completed" }));
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
        if (streamError && streamError.length > 0) {
            dispatch(chatActions.updateMessageStatus({ status: "error" }));
            console.log("===> [CHAT STREAM DISPLAY] Stream error", streamError);
        }
    }, [streamError]);

    useEffect(() => {
        // Check if streamData exists and has at least one item
        if (streamData && streamData.length > 0) {
            // Get the latest data item
            const latestData = streamData[streamData.length - 1];
            handleNewDataContent(latestData);
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
                {segment.isQuestionnaire ? (
                    <QuestionnaireLoadingVisualization />
                ) : segment.isThinking ? (
                    <ThinkingVisualization thinkingText={segment.content} showThinking={true} />
                ) : segment.isReasoning ? (
                    <ThinkingVisualization thinkingText={segment.content} showThinking={true} />
                ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {segment.content}
                    </ReactMarkdown>
                )}
            </React.Fragment>
        ));
    };

    if (content.length < 2) {
        if (!isStreaming && hasListenerId) {
            return (
                <div className="mb-3 w-full text-left">
                    <div className="inline-block p-3 rounded-lg bg-inherit">
                        <ControlledLoadingIndicator settings={settings} />
                    </div>
                </div>
            );
        }
        return null;
    }

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
