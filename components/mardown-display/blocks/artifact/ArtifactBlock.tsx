"use client";

import React, { useMemo } from "react";
import { Layers, ExternalLink } from "lucide-react";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import BasicMarkdownContent from "../../chat-markdown/BasicMarkdownContent";

interface ArtifactBlockProps {
    content: string;
    metadata?: {
        isComplete?: boolean;
        artifactId?: string;
        artifactIndex?: number;
        artifactType?: string;
        artifactTitle?: string;
        rawXml?: string;
    };
    serverData?: {
        artifactId?: string;
        artifactIndex?: number;
        artifactType?: string;
        title?: string;
        content?: string;
    } | null;
    isStreamActive?: boolean;
    messageId?: string;
}

const ArtifactBlock: React.FC<ArtifactBlockProps> = ({
    content,
    metadata,
    serverData,
    isStreamActive,
    messageId,
}) => {
    const { open } = useCanvas();

    const artifactTitle = serverData?.title || metadata?.artifactTitle || "Artifact";
    const artifactType = serverData?.artifactType || metadata?.artifactType || "text";
    const artifactIndex = serverData?.artifactIndex ?? metadata?.artifactIndex ?? 0;
    const artifactId = serverData?.artifactId || metadata?.artifactId || `artifact-${artifactIndex}`;
    const isComplete = metadata?.isComplete !== false;

    const canvasType = useMemo(() => {
        const typeMap: Record<string, string> = {
            iframe: "iframe",
            html: "html",
            code: "code",
            diagram: "diagram",
            flashcards: "flashcards",
            quiz: "quiz",
            presentation: "presentation",
            timeline: "timeline",
            research: "research",
            comparison: "comparison",
            image: "image",
        };
        return typeMap[artifactType] || "html";
    }, [artifactType]);

    const handleOpenCanvas = () => {
        open({
            type: canvasType as any,
            data: content,
            metadata: {
                title: artifactTitle,
                sourceMessageId: messageId,
            },
        });
    };

    return (
        <div className="my-2 rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                    <Layers className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">
                        {artifactTitle}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                        {artifactType}
                    </span>
                    {!isComplete && isStreamActive && (
                        <span className="text-xs text-muted-foreground animate-pulse">
                            streaming...
                        </span>
                    )}
                </div>
                <button
                    onClick={handleOpenCanvas}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors shrink-0"
                    title="Open in canvas"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open</span>
                </button>
            </div>
            <div className="p-3 max-h-[300px] overflow-y-auto text-sm">
                <BasicMarkdownContent content={content} isStreamActive={isStreamActive} />
            </div>
        </div>
    );
};

export default ArtifactBlock;
