"use client";

import { Copy } from "lucide-react";
import MarkdownStream from "@ai-matrx/chat/ui/markdown-stream/MarkdownStream";
import { Button } from "@ai-matrx/design-system/controls";
import { formatPoints } from "@ai-matrx/kit/format";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { copyToClipboard } from "@/lib/clipboard/copy";

import type { AdvancedItem } from "./contract";

/**
 * What the advanced reader got for ONE page: the reader used, seconds and points in one muted line;
 * on success the page as markdown with Copy; on failure one plain sentence.
 */
export function AdvancedReadResult({ item }: { item: AdvancedItem }) {
  const body = item.markdown ?? item.text;
  const facts = [item.reader ? capitalize(item.reader) : null, `${item.seconds.toFixed(1)} s`, formatPoints(item.points)].filter(Boolean).join(" · ");
  if (!item.ok) {
    return (
      <div className="flex flex-col gap-1" data-advanced-read-result="failed">
        <p className="text-sm text-destructive">
          {item.message || "The advanced reader could not read this page."}
          <ErrorAlchemyMenu error={item.message} />
        </p>
        <p className="text-xs text-muted-foreground">{facts}</p>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-2" data-advanced-read-result="done">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{facts}</span>
        {body ? (
          <Button variant="quiet" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => void copyToClipboard(body, "Copied")} data-action="advanced-read-copy">
            Copy
          </Button>
        ) : null}
      </div>
      {body ? (
        <div className="max-h-96 min-w-0 overflow-auto rounded-md border border-border bg-muted p-2 text-sm" data-advanced-read-content="">
          <MarkdownStream content={body} isStreamActive={false} hideCopyButton />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No text came back</p>
      )}
    </div>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
