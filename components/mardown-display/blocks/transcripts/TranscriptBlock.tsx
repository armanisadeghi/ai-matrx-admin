"use client";
import React, { useState, useMemo } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Database, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdvancedTranscriptViewer from "@/components/mardown-display/blocks/transcripts/AdvancedTranscriptViewer";
import { ImportTranscriptModal } from "@/features/transcripts/components/ImportTranscriptModal";
import { parseTranscript, type ParsedTranscript } from "./transcript-parser";
import { useToast } from "@/components/ui/use-toast";
import { formatDurationSeconds } from "@ai-matrx/kit/format";
import { useOpenSaveToTable } from "@/features/overlays/definitions/saveToTable.overlay";
import { transcriptTableRows } from "@/features/transcripts/format";

interface TranscriptBlockProps {
  content: string;
  /** Already-parsed transcript (a kind value's bridge output) — skips re-parsing `content`. */
  parsed?: ParsedTranscript;
}

const TranscriptBlock: React.FC<TranscriptBlockProps> = ({ content, parsed: given }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { toast } = useToast();

  const parsed = useMemo(() => given ?? parseTranscript(content), [given, content]);
  const openSaveToTable = useOpenSaveToTable();

  const collapsibleTitle = parsed.title ?? "Transcript";

  const handleCopySegment = (text: string) => {
    toast({
      title: "Copied to clipboard",
      description: "The transcript segment has been copied to your clipboard",
    });
  };

  const handleTimeClick = (seconds: number) => {
    toast({
      title: "Time selected",
      description: `Jumped to ${formatDurationSeconds(seconds, { style: "clock" })} in the audio`,
    });
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm my-4"
    >
      <div className="relative flex w-full items-center justify-between rounded-t-lg border-b border-zinc-200 dark:border-zinc-700">
        <CollapsibleTrigger className="flex-1 flex items-center gap-2 py-3 px-4 font-medium hover:bg-accent/50">
          <FileText className="h-4 w-4 text-primary" />
          <span>{collapsibleTitle}</span>
          <ChevronDown
            className={`h-4 w-4 ml-auto shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <Button
          icon={<Upload />}
          variant="quiet"
          onClick={(e) => {
            e.stopPropagation();
            setIsImportModalOpen(true);
          }}
          className="mr-2"
        >
          Import
        </Button>
        {openSaveToTable && parsed.segments.length > 0 ? (
          <Button
            icon={<Database />}
            variant="quiet"
            onClick={(e) => {
              e.stopPropagation();
              openSaveToTable({
                value: transcriptTableRows(parsed.segments),
                title: parsed.title ?? "Transcript",
              });
            }}
            className="mr-2"
          >
            Save to a table
          </Button>
        ) : null}
      </div>
      <CollapsibleContent className="bg-transparent">
        <div className="p-2 bg-transparent">
          <AdvancedTranscriptViewer
            content={content}
            parsedTranscript={parsed}
            hideTitle={false}
            onTimeClick={handleTimeClick}
            onCopySegment={handleCopySegment}
          />
        </div>
      </CollapsibleContent>

      {/* Import Modal */}
      <ImportTranscriptModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        segments={parsed.segments}
      />
    </Collapsible>
  );
};

export default TranscriptBlock;
