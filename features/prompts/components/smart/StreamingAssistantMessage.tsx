"use client";

import React from 'react';
import { useAppSelector } from "@/lib/redux/hooks";
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseToolUpdatesByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { PromptAssistantMessage } from '../builder/PromptAssistantMessage';

interface StreamingAssistantMessageProps {
    taskId: string;
    messageIndex: number;
    compact?: boolean;
}

/**
 * Isolated component that connects to Redux for streaming text.
 * This prevents the parent (SmartMessageList) from re-rendering on every chunk.
 */
export function StreamingAssistantMessage({ taskId, messageIndex, compact }: StreamingAssistantMessageProps) {
    // Select the streaming text ONLY in this component
    const streamingText = useAppSelector(selectPrimaryResponseTextByTaskId(taskId));
    const toolUpdates = useAppSelector(selectPrimaryResponseToolUpdatesByTaskId(taskId));

    return (
        <PromptAssistantMessage
            content={streamingText || ''}
            toolUpdates={toolUpdates}
            taskId={taskId}
            messageIndex={messageIndex}
            isStreamActive={true}
            compact={compact}
        />
    );
}
