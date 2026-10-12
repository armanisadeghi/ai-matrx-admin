"use client";

/**
 * One gallery tile, Google-style: the rendered first page / first sheet, the
 * name under it. Thumbnail = the stored PNG (durable file ref through the media
 * primitives). A template without one yet shows its live miniature, drawn
 * from its snapshot by the same renderer that makes the stored thumbnail.
 */
import { useEffect, useState, type ReactNode } from "react";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { FileSpreadsheet, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TemplateSummary } from "../types";
import { snapshotPreviewSvg } from "../thumbnail/snapshot-preview-svg";
import { getTemplateSnapshot } from "../template-service";

function useLivePreview(template: TemplateSummary): string | null {
  const [svg, setSvg] = useState<string | null>(null);
  const missing = !template.thumbnailUrl;
  useEffect(() => {
    if (!missing) return undefined;
    let cancelled = false;
    void getTemplateSnapshot(template.id)
      .then((snapshot) => {
        if (!cancelled) setSvg(snapshotPreviewSvg(template.kind, snapshot));
      })
      .catch((err) => console.warn(`[templates] preview for ${template.id} failed`, err));
    return () => {
      cancelled = true;
    };
  }, [missing, template]);
  return svg;
}

export function TemplateThumb({
  template,
  onSelect,
  busy = false,
  caption = true,
  className,
}: {
  template: TemplateSummary;
  onSelect?: (template: TemplateSummary) => void;
  busy?: boolean;
  /** The name (and category) under the tile. */
  caption?: boolean;
  /** Placement only (width). */
  className?: string;
}): ReactNode {
  const liveSvg = useLivePreview(template);
  const KindIcon = template.kind === "workbook" ? FileSpreadsheet : FileText;
  return (
    <div className={cn("flex w-36 min-w-0 flex-col gap-1.5", className)}>
      <button
        type="button"
        data-clickable
        disabled={busy}
        aria-label={`Use template ${template.name}`}
        title={template.description ?? template.name}
        onClick={() => onSelect?.(template)}
        className={cn(
          "relative aspect-[320/414] w-full overflow-hidden rounded-md border border-border bg-white transition-colors",
          "hover:border-primary focus-visible:border-primary focus-visible:outline-none",
          busy && "opacity-60",
        )}
      >
        {template.thumbnailUrl ? (
          <InlineMediaRef
            ref={template.thumbnailUrl}
            size="fill"
            fit="cover"
            fallback="skeleton"
            errorFallback="skeleton"
            alt={`${template.name} preview`}
          />
        ) : liveSvg ? (
          <span
            aria-hidden
            className="block size-full [&>svg]:size-full"
            // Our own SVG: every text node is escaped in snapshot-preview-svg.
            dangerouslySetInnerHTML={{ __html: liveSvg }}
          />
        ) : (
          <span aria-hidden className="block size-full animate-pulse bg-muted" />
        )}
      </button>
      {caption && (
        <div className="flex min-w-0 items-center gap-1.5 px-0.5">
          <KindIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-xs font-medium text-foreground">{template.name}</span>
        </div>
      )}
    </div>
  );
}
