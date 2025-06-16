"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BasicMarkdownContent from "@/components/mardown-display/chat-markdown/BasicMarkdownContent";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectPrimaryCombinedTextByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";


interface TextResponseDisplayProps {
    taskId: string;
    isExecuting?: boolean;
}

export const TextResponseDisplay: React.FC<TextResponseDisplayProps> = ({ 
    taskId, 
    isExecuting = false 
}) => {
    const textResponse = useAppSelector((state) => selectPrimaryCombinedTextByTaskId(taskId)(state));
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        {isExecuting && (
                            <span className="text-sm text-muted-foreground font-normal">
                                (streaming...)
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <BasicMarkdownContent 
                        content={textResponse} 
                        isStreamActive={isExecuting}
                        showCopyButton={true}
                    />
                </CardContent>
            </Card>
        </div>
    );
}; 