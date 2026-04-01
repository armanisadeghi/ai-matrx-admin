"use client";

/**
 * ContentBlockRenderer
 *
 * Renders a single content block from an AgentDefinitionMessage.
 * Handles all known block types. For unknown/unexpected types, shows a
 * caution badge that opens a full-screen JSON modal when clicked.
 *
 * Block types handled:
 *   text          → inline (nothing — caller renders the textarea)
 *                   or compact preview pill
 *   image         → thumbnail with URL label
 *   audio         → audio pill (URL + transcription badge)
 *   video         → video pill
 *   youtube_video → YouTube pill with link
 *   document      → document pill with URL/type label
 *   input_*       → structured input pill (notes, task, table, list, webpage, data)
 *   <unknown>     → caution badge → JSON modal
 */

import { useState } from "react";
import {
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Youtube,
  Globe,
  Database,
  List,
  Table2,
  NotebookPen,
  CheckSquare,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
// Block type imports removed — all blocks are handled as Record<string, unknown>
// to support both canonical (.text) and legacy DB (.content) field names.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageContentItemRendererProps {
  /** Raw block object — may have .text or .content for text blocks (legacy DB). */
  block: Record<string, unknown>;
  /** When true, skip rendering TextBlocks (caller handles via textarea). */
  hideText?: boolean;
  /** Called to remove this block from the message. */
  onRemove?: () => void;
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export function MessageContentItemRenderer({
  block,
  hideText = false,
  onRemove,
}: MessageContentItemRendererProps) {
  const type = block.type as string | undefined;

  if (!type) return <UnknownBlockBadge block={block} onRemove={onRemove} />;

  switch (type) {
    case "text":
      if (hideText) return null;
      return <TextBlockPreview block={block} onRemove={onRemove} />;

    case "image":
      return <ImageBlockPill block={block} onRemove={onRemove} />;

    case "audio":
      return <AudioBlockPill block={block} onRemove={onRemove} />;

    case "video":
      return <VideoBlockPill block={block} onRemove={onRemove} />;

    case "youtube_video":
      return <YouTubeBlockPill block={block} onRemove={onRemove} />;

    case "document":
      return <DocumentBlockPill block={block} onRemove={onRemove} />;

    case "input_webpage":
      return (
        <StructuredInputPill
          icon={<Globe className="w-3 h-3" />}
          label="Webpage"
          detail={
            Array.isArray(block.urls) && block.urls.length > 0
              ? `${block.urls.length} URL(s)`
              : undefined
          }
          onRemove={onRemove}
        />
      );

    case "input_notes":
      return (
        <StructuredInputPill
          icon={<NotebookPen className="w-3 h-3" />}
          label="Notes"
          detail={
            Array.isArray(block.note_ids)
              ? `${block.note_ids.length} note(s)`
              : undefined
          }
          onRemove={onRemove}
        />
      );

    case "input_task":
      return (
        <StructuredInputPill
          icon={<CheckSquare className="w-3 h-3" />}
          label="Tasks"
          detail={
            Array.isArray(block.task_ids)
              ? `${block.task_ids.length} task(s)`
              : undefined
          }
          onRemove={onRemove}
        />
      );

    case "input_table":
      return (
        <StructuredInputPill
          icon={<Table2 className="w-3 h-3" />}
          label="Table"
          onRemove={onRemove}
        />
      );

    case "input_list":
      return (
        <StructuredInputPill
          icon={<List className="w-3 h-3" />}
          label="List"
          onRemove={onRemove}
        />
      );

    case "input_data":
      return (
        <StructuredInputPill
          icon={<Database className="w-3 h-3" />}
          label="Data"
          onRemove={onRemove}
        />
      );

    default:
      return <UnknownBlockBadge block={block} onRemove={onRemove} />;
  }
}

// ---------------------------------------------------------------------------
// Individual block renderers
// ---------------------------------------------------------------------------

function TextBlockPreview({
  block,
  onRemove,
}: {
  block: Record<string, unknown>;
  onRemove?: () => void;
}) {
  // Canonical field is `.text` — malformed DB data is normalised at the Redux boundary.
  const text = (block.text as string | undefined) ?? "";
  return (
    <BlockPill
      icon={<FileText className="w-3 h-3" />}
      label="Text"
      detail={text.slice(0, 40) + (text.length > 40 ? "…" : "")}
      onRemove={onRemove}
    />
  );
}

function ImageBlockPill({
  block,
  onRemove,
}: {
  block: Record<string, unknown>;
  onRemove?: () => void;
}) {
  const url = block.url as string | undefined;
  const base64 = block.base64_data as string | undefined;
  const mimeType = block.mime_type as string | undefined;
  const src = url ?? (base64 ? "[base64]" : undefined);
  return (
    <div className="flex items-start gap-2">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Attached image"
          className="h-16 w-auto max-w-[120px] rounded border border-border object-cover shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <BlockPill
        icon={<ImageIcon className="w-3 h-3" />}
        label="Image"
        detail={src ? truncateUrl(src) : (mimeType ?? "unknown")}
        onRemove={onRemove}
      />
    </div>
  );
}

function AudioBlockPill({
  block,
  onRemove,
}: {
  block: Record<string, unknown>;
  onRemove?: () => void;
}) {
  const url = block.url as string | undefined;
  const mimeType = block.mime_type as string | undefined;
  const autoTranscribe = block.auto_transcribe as boolean | undefined;
  return (
    <BlockPill
      icon={<Music className="w-3 h-3" />}
      label="Audio"
      detail={url ? truncateUrl(url) : (mimeType ?? "base64")}
      badge={autoTranscribe ? "auto-transcribe" : undefined}
      onRemove={onRemove}
    />
  );
}

function VideoBlockPill({
  block,
  onRemove,
}: {
  block: Record<string, unknown>;
  onRemove?: () => void;
}) {
  const url = block.url as string | undefined;
  const mimeType = block.mime_type as string | undefined;
  return (
    <BlockPill
      icon={<Video className="w-3 h-3" />}
      label="Video"
      detail={url ? truncateUrl(url) : (mimeType ?? "base64")}
      onRemove={onRemove}
    />
  );
}

function YouTubeBlockPill({
  block,
  onRemove,
}: {
  block: Record<string, unknown>;
  onRemove?: () => void;
}) {
  const url = (block.url as string | undefined) ?? "";
  return (
    <BlockPill
      icon={<Youtube className="w-3 h-3 text-red-500" />}
      label="YouTube"
      detail={url ? truncateUrl(url) : "no URL"}
      href={url || undefined}
      onRemove={onRemove}
    />
  );
}

function DocumentBlockPill({
  block,
  onRemove,
}: {
  block: Record<string, unknown>;
  onRemove?: () => void;
}) {
  const url = block.url as string | undefined;
  const mimeType = block.mime_type as string | undefined;
  const label =
    mimeType === "application/pdf"
      ? "PDF"
      : (mimeType?.split("/")[1]?.toUpperCase() ?? "Document");
  return (
    <BlockPill
      icon={<FileText className="w-3 h-3" />}
      label={label}
      detail={url ? truncateUrl(url) : "base64"}
      href={url}
      onRemove={onRemove}
    />
  );
}

function StructuredInputPill({
  icon,
  label,
  detail,
  onRemove,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  onRemove?: () => void;
}) {
  return (
    <BlockPill
      icon={icon}
      label={label}
      detail={detail}
      variant="secondary"
      onRemove={onRemove}
    />
  );
}

// ---------------------------------------------------------------------------
// Unknown block — caution badge + JSON modal
// ---------------------------------------------------------------------------

function UnknownBlockBadge({
  block,
  onRemove,
}: {
  block: Record<string, unknown>;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const type = (block.type as string) ?? "unknown";

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
          title="Unknown block type — click to inspect"
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span className="font-medium">Unsupported: {type}</span>
        </button>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Unsupported block type: <code className="font-mono">{type}</code>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            This block type is not yet rendered by the builder UI. The data is
            preserved in the agent definition and will be sent to the API
            unchanged.
          </p>
          <ScrollArea className="max-h-[60vh] rounded-md border bg-muted">
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(block, null, 2)}
            </pre>
          </ScrollArea>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared BlockPill — consistent pill chrome
// ---------------------------------------------------------------------------

interface BlockPillProps {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  badge?: string;
  href?: string;
  variant?: "default" | "secondary";
  onRemove?: () => void;
}

function BlockPill({
  icon,
  label,
  detail,
  badge,
  href,
  variant = "default",
  onRemove,
}: BlockPillProps) {
  const bg =
    variant === "secondary"
      ? "border-border bg-muted/60"
      : "border-border bg-card";

  const inner = (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${bg} min-w-0 max-w-full`}
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="font-medium shrink-0">{label}</span>
      {detail && (
        <span className="text-muted-foreground truncate max-w-[200px]">
          {detail}
        </span>
      )}
      {badge && (
        <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">
          {badge}
        </Badge>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity min-w-0"
        >
          {inner}
        </a>
      ) : (
        inner
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title="Remove block"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateUrl(url: string, max = 50): string {
  try {
    const u = new URL(url);
    const path = u.pathname.split("/").pop() ?? u.hostname;
    const host = u.hostname.replace(/^www\./, "");
    const display = `${host}/…/${path}`;
    return display.length > max ? display.slice(0, max) + "…" : display;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}
