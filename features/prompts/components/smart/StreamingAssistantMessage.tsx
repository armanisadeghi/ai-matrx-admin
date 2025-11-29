"use client";

import React from 'react';
import { useAppSelector } from '@/lib/redux';
import { selectPrimaryResponseTextByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { PromptAssistantMessage } from '../builder/PromptAssistantMessage';

interface StreamingAssistantMessageProps {
    taskId: string;
    messageIndex: number;
}

/**
 * Isolated component that connects to Redux for streaming text.
 * This prevents the parent (SmartMessageList) from re-rendering on every chunk.
 */
export function StreamingAssistantMessage({ taskId, messageIndex }: StreamingAssistantMessageProps) {
    // Select the streaming text ONLY in this component
    const streamingText = useAppSelector(selectPrimaryResponseTextByTaskId(taskId));

    return (
        <PromptAssistantMessage
            content={streamingText || ''}
            taskId={taskId}
            messageIndex={messageIndex}
            isStreamActive={true}
        />
    );
}
