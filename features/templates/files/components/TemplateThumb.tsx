"use client";

/**
 * One gallery tile, Google-style: the rendered first page / first sheet, the
 * name under it. Thumbnail = the stored PNG (durable file ref through the media
 * primitives). A template without one yet shows its live miniature, drawn
 * from its snapshot by the same renderer that makes the stored thumbnail.
 */
import { useEffect, useState, type ReactNode } from "react";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { FileSpreadsheet, FileText, Presentation } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TemplateSummary } from "../types";
import { snapshotPreviewSvg } from "../thumbnail/snapshot-preview-svg";
import { getTemplateSnapshot } from "../template-service";
// A presentation template's tile is its first slide, drawn live by the deck renderer.
import { DeckFirstSlide } from "@/features/presentations/components/DeckFirstSlide";


function useTemplateSnapshot(template: TemplateSummary): unknown {
  const [snapshot, setSnapshot] = useState<unknown>(null);
  const wanted = template.kind === "presentation" || !template.thumbnailUrl;
  useEffect(() => {
    if (!wanted) return undefined;
    let cancelled = false;
    void getTemplateSnapshot(template.id)
      .then((s) => {
        if (!cancelled) setSnapshot(s);
      })
      .catch((err) => console.warn(`[templates] preview for ${template.id} failed`, err));
    return () => {
      cancelled = true;
    };
  }, [wanted, template]);
  return snapshot;
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
  const snapshot = useTemplateSnapshot(template);
  const isDeck = template.kind === "presentation";
  const liveSvg =
    !isDeck && !template.thumbnailUrl && snapshot ? snapshotPreviewSvg(template.kind as "workbook" | "document", snapshot) : null;
  const KindIcon = template.kind === "workbook" ? FileSpreadsheet : isDeck ? Presentation : FileText;
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
          "relative w-full overflow-hidden rounded-md border border-border bg-white transition-colors",
          isDeck ? "aspect-video" : "aspect-[320/414]",
          "hover:border-primary focus-visible:border-primary focus-visible:outline-none",
          busy && "opacity-60",
        )}
      >
        {isDeck ? (
          snapshot ? (
            <DeckFirstSlide deck={snapshot} className="pointer-events-none absolute inset-0" />
          ) : (
            <span aria-hidden className="block size-full animate-pulse bg-muted" />
          )
        ) : template.thumbnailUrl ? (
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

/** A tile's footprint before its template is known: the same face and caption boxes as `TemplateThumb`. */
export function TemplateThumbSkeleton({ kind, className }: { kind: TemplateSummary["kind"]; className?: string }): ReactNode {
  return (
    <div aria-hidden className={cn("flex w-36 min-w-0 flex-col gap-1.5", className)}>
      <div
        className={cn(
          "w-full animate-pulse overflow-hidden rounded-md border border-border bg-muted",
          kind === "presentation" ? "aspect-video" : "aspect-[320/414]",
        )}
      />
      <div className="flex h-4 min-w-0 items-center gap-1.5 px-0.5">
        <div className="size-3.5 shrink-0 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
