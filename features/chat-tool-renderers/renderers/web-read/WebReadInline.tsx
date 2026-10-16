"use client";

import type { ToolRendererProps } from "@ai-matrx/chat/tool-call-visualization/types";
import { ScrapeInline } from "@ai-matrx/chat/tool-call-visualization/renderers/scrape/ScrapeInline";

import { AdvancedReadBatch, AdvancedReadButton, AdvancedReadResults } from "@/features/data-sources/advanced-read";

import { failedCoveredPages } from "./failedPages";

/**
 * The page-read tools' result: the package's page cards, plus — for pages that really failed and are
 * covered by a slower paid reader — "Try advanced reader" (one page) or "Try all N" (several). The
 * price is quoted before the click; nothing paid runs by itself.
 */
export function WebReadInline(props: ToolRendererProps) {
  const failed = failedCoveredPages(props.entry);
  return (
    <div className="flex flex-col gap-2">
      <ScrapeInline {...props} />
      {failed.length === 1 ? (
        <div className="flex flex-col gap-1">
          <span className="truncate text-xs text-muted-foreground" title={failed[0].url}>{failed[0].url}</span>
          <AdvancedReadButton url={failed[0].url} coverage={failed[0].coverage} />
        </div>
      ) : null}
      {failed.length > 1 ? (
        <>
          <AdvancedReadBatch urls={failed.map((f) => f.url)} />
          <AdvancedReadResults urls={failed.map((f) => f.url)} />
        </>
      ) : null}
    </div>
  );
}
