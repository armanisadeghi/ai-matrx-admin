"use client";
import React, { useState } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, FileText } from "lucide-react";
import AdvancedTranscriptViewer from "@/components/mardown-display/blocks/transcripts/AdvancedTranscriptViewer";
import { useToast } from "@/components/ui/use-toast";

interface TranscriptBlockProps {
    content: string;
}

const TranscriptBlock: React.FC<TranscriptBlockProps> = ({ content }) => {
    const [isOpen, setIsOpen] = useState(true);
    const { toast } = useToast();

    const handleCopySegment = (text: string) => {
        toast({
            title: "Copied to clipboard",
            description: "The transcript segment has been copied to your clipboard",
        });
    };

    const handleTimeClick = (seconds: number) => {
        toast({
            title: "Time selected",
            description: `Jumped to ${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")} in the audio`,
        });
    };

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm my-4"
        >
            <CollapsibleTrigger className="relative flex w-full items-center justify-between rounded-t-lg py-3 px-4 font-medium hover:bg-accent/50 hover:shadow-sm">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Transcript</span>
                </div>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up bg-transparent">
                <div className="p-2 bg-transparent">
                    <AdvancedTranscriptViewer
                        content={content}
                        hideTitle={false}
                        onTimeClick={handleTimeClick}
                        onCopySegment={handleCopySegment}
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};

export default TranscriptBlock;