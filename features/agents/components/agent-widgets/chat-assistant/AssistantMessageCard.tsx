"use client";

import { Webhook } from "lucide-react";
import MarkdownStream from "@/components/MarkdownStream";

interface AssistantMessageCardProps {
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
}

export function AssistantMessageCard({
  content,
  timestamp,
  isStreaming,
}: AssistantMessageCardProps) {
  return (
    <div className="w-72 bg-card border border-border rounded-xl shadow-sm animate-in slide-in-from-bottom-2 duration-200 overflow-hidden">
      <div className="px-3 py-2">
        <div className="flex items-start gap-2">
          <div className="p-0.5 rounded-full bg-primary/10 shrink-0 mt-0.5">
            <Webhook className="w-3 h-3 text-primary" />
          </div>
          <div className="min-w-0 flex-1 text-xs leading-relaxed [&_p]:m-0 [&_pre]:text-[10px] [&_code]:text-[10px] overflow-hidden">
            <MarkdownStream content={content} isStreamActive={isStreaming} />
          </div>
        </div>
      </div>
      {timestamp && (
        <div className="px-3 pb-1.5">
          <span className="text-[10px] text-muted-foreground">{timestamp}</span>
        </div>
      )}
    </div>
  );
}
