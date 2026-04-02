"use client";

/**
 * AgentUserMessage
 *
 * Renders a user turn — text + content block chips — inside one collapsible
 * bubble, matching the style of PromptUserMessage.
 *
 * Content blocks arrive in two shapes:
 *   Live  → { type: "image"|"audio"|"video"|"document"|"youtube_video"|"input_*", ... }
 *   DB    → { type: "media", kind: "image"|"audio"|"video"|"document"|"youtube", url }
 *
 * Chips are tiny pill-shaped references. Clicking opens a per-type modal
 * (placeholder JSON viewer until real modals are built).
 */

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  Globe,
  StickyNote,
  CheckSquare,
  Table2,
  List,
  Database,
  Youtube,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ContentBlock {
  type: string;
  [key: string]: unknown;
}

interface AgentUserMessageProps {
  content: string;
  contentBlocks?: Array<Record<string, unknown>>;
  messageIndex: number;
  compact?: boolean;
}

interface NormalisedBlock {
  key: string;
  blockType: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  chipBg: string;
  chipBorder: string;
  label: string;
  title: string;
  raw: ContentBlock;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation
// ─────────────────────────────────────────────────────────────────────────────

function normaliseBlock(
  block: ContentBlock,
  idx: number,
): NormalisedBlock | null {
  if (block.type === "text") return null;

  const key = `block-${idx}`;

  if (block.type === "media") {
    return mediaChip(key, block["kind"] as string, block);
  }

  switch (block.type) {
    case "image":
      return mediaChip(key, "image", block);
    case "audio":
      return mediaChip(key, "audio", block);
    case "video":
      return mediaChip(key, "video", block);
    case "document":
      return mediaChip(key, "document", block);
    case "youtube_video":
      return mediaChip(key, "youtube", block);

    case "input_webpage":
      return chip(
        key,
        "input_webpage",
        Globe,
        "text-teal-600 dark:text-teal-400",
        "bg-teal-50 dark:bg-teal-950/30",
        "border-teal-300 dark:border-teal-700",
        "Webpage",
        block,
      );
    case "input_notes":
      return chip(
        key,
        "input_notes",
        StickyNote,
        "text-orange-600 dark:text-orange-400",
        "bg-orange-50 dark:bg-orange-950/30",
        "border-orange-300 dark:border-orange-700",
        "Note",
        block,
      );
    case "input_task":
      return chip(
        key,
        "input_task",
        CheckSquare,
        "text-blue-600 dark:text-blue-400",
        "bg-blue-50 dark:bg-blue-950/30",
        "border-blue-300 dark:border-blue-700",
        "Task",
        block,
      );
    case "input_table":
      return chip(
        key,
        "input_table",
        Table2,
        "text-green-600 dark:text-green-400",
        "bg-green-50 dark:bg-green-950/30",
        "border-green-300 dark:border-green-700",
        "Table",
        block,
      );
    case "input_list":
      return chip(
        key,
        "input_list",
        List,
        "text-purple-600 dark:text-purple-400",
        "bg-purple-50 dark:bg-purple-950/30",
        "border-purple-300 dark:border-purple-700",
        "List",
        block,
      );
    case "input_data":
      return chip(
        key,
        "input_data",
        Database,
        "text-gray-600 dark:text-gray-400",
        "bg-gray-50 dark:bg-gray-950/30",
        "border-gray-300 dark:border-gray-700",
        "Data",
        block,
      );

    default:
      return null;
  }
}

function mediaChip(
  key: string,
  kind: string,
  raw: ContentBlock,
): NormalisedBlock {
  const map: Record<
    string,
    [
      React.ComponentType<{ className?: string }>,
      string,
      string,
      string,
      string,
    ]
  > = {
    image: [
      ImageIcon,
      "text-blue-600 dark:text-blue-400",
      "bg-blue-50 dark:bg-blue-950/30",
      "border-blue-300 dark:border-blue-700",
      "Image",
    ],
    audio: [
      Music,
      "text-pink-600 dark:text-pink-400",
      "bg-pink-50 dark:bg-pink-950/30",
      "border-pink-300 dark:border-pink-700",
      "Audio",
    ],
    video: [
      Video,
      "text-indigo-600 dark:text-indigo-400",
      "bg-indigo-50 dark:bg-indigo-950/30",
      "border-indigo-300 dark:border-indigo-700",
      "Video",
    ],
    document: [
      FileText,
      "text-gray-600 dark:text-gray-400",
      "bg-gray-50 dark:bg-gray-950/30",
      "border-gray-300 dark:border-gray-700",
      "Doc",
    ],
    youtube: [
      Youtube,
      "text-red-600 dark:text-red-400",
      "bg-red-50 dark:bg-red-950/30",
      "border-red-300 dark:border-red-700",
      "YouTube",
    ],
  };
  const [icon, iconColor, chipBg, chipBorder, defaultLabel] =
    map[kind] ?? map.document;
  const title =
    (raw["filename"] as string) ??
    (raw["title"] as string) ??
    (raw["url"] as string)?.split("/").pop() ??
    defaultLabel;
  return {
    key,
    blockType: raw.type === "media" ? `media_${kind}` : raw.type,
    icon,
    iconColor,
    chipBg,
    chipBorder,
    label: defaultLabel,
    title,
    raw,
  };
}

function chip(
  key: string,
  blockType: string,
  icon: React.ComponentType<{ className?: string }>,
  iconColor: string,
  chipBg: string,
  chipBorder: string,
  label: string,
  raw: ContentBlock,
): NormalisedBlock {
  const title =
    (raw["title"] as string) ??
    (raw["label"] as string) ??
    (raw["name"] as string) ??
    label;
  return {
    key,
    blockType,
    icon,
    iconColor,
    chipBg,
    chipBorder,
    label,
    title,
    raw,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-type modal placeholders
// Each is a named component so they can be replaced with real UI later.
// ─────────────────────────────────────────────────────────────────────────────

interface BlockModalProps {
  block: NormalisedBlock;
  onClose: () => void;
}

function BlockModalShell({
  block,
  onClose,
  children,
}: BlockModalProps & { children?: React.ReactNode }) {
  const Icon = block.icon;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Icon className={cn("w-4 h-4", block.iconColor)} />
          <span className="text-sm font-semibold flex-1 truncate">
            {block.title}
          </span>
          <span className="text-xs text-muted-foreground">{block.label}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-2"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {children ?? (
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-all font-mono">
              {JSON.stringify(block.raw, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageBlockModal({ block, onClose }: BlockModalProps) {
  const url = block.raw["url"] as string | undefined;
  return (
    <BlockModalShell block={block} onClose={onClose}>
      {url ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={block.title}
            className="w-full rounded-lg object-contain max-h-64"
          />
          <pre className="text-xs text-foreground/60 whitespace-pre-wrap break-all font-mono">
            {JSON.stringify(block.raw, null, 2)}
          </pre>
        </div>
      ) : (
        <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-all font-mono">
          {JSON.stringify(block.raw, null, 2)}
        </pre>
      )}
    </BlockModalShell>
  );
}

function AudioBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function VideoBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function DocumentBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function YoutubeBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function WebpageBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function NoteBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function TaskBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function TableBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function ListBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function DataBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function UnknownBlockModal({ block, onClose }: BlockModalProps) {
  return <BlockModalShell block={block} onClose={onClose} />;
}

function BlockModal({ block, onClose }: BlockModalProps) {
  switch (block.blockType) {
    case "image":
    case "media_image":
      return <ImageBlockModal block={block} onClose={onClose} />;
    case "audio":
    case "media_audio":
      return <AudioBlockModal block={block} onClose={onClose} />;
    case "video":
    case "media_video":
      return <VideoBlockModal block={block} onClose={onClose} />;
    case "document":
    case "media_document":
      return <DocumentBlockModal block={block} onClose={onClose} />;
    case "youtube_video":
    case "media_youtube":
      return <YoutubeBlockModal block={block} onClose={onClose} />;
    case "input_webpage":
      return <WebpageBlockModal block={block} onClose={onClose} />;
    case "input_notes":
      return <NoteBlockModal block={block} onClose={onClose} />;
    case "input_task":
      return <TaskBlockModal block={block} onClose={onClose} />;
    case "input_table":
      return <TableBlockModal block={block} onClose={onClose} />;
    case "input_list":
      return <ListBlockModal block={block} onClose={onClose} />;
    case "input_data":
      return <DataBlockModal block={block} onClose={onClose} />;
    default:
      return <UnknownBlockModal block={block} onClose={onClose} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chip — tiny pill reference inside the bubble
// ─────────────────────────────────────────────────────────────────────────────

function AttachmentChip({ block }: { block: NormalisedBlock }) {
  const [open, setOpen] = useState(false);
  const Icon = block.icon;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none",
          "cursor-pointer transition-colors hover:brightness-95 active:brightness-90",
          block.chipBg,
          block.chipBorder,
          block.iconColor,
        )}
        title={block.title}
      >
        <Icon className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="max-w-[120px] truncate">{block.title}</span>
      </button>

      {open && <BlockModal block={block} onClose={() => setOpen(false)} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component — collapsible bubble identical in style to PromptUserMessage
// ─────────────────────────────────────────────────────────────────────────────

export function AgentUserMessage({
  content,
  contentBlocks,
  messageIndex,
  compact = false,
}: AgentUserMessageProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [shouldBeCollapsible, setShouldBeCollapsible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const measureRef = useRef<HTMLDivElement>(null);
  const previousContentRef = useRef<string>("");

  const normalisedBlocks: NormalisedBlock[] = (contentBlocks ?? [])
    .map((b, i) => normaliseBlock(b as ContentBlock, i))
    .filter((b): b is NormalisedBlock => b !== null);

  const trimmedText = content.trim();
  const hasContent = trimmedText || normalisedBlocks.length > 0;

  useEffect(() => {
    if (measureRef.current) {
      const COLLAPSE_THRESHOLD = 48;
      const contentHeight = measureRef.current.scrollHeight;
      const isLong = contentHeight > COLLAPSE_THRESHOLD;
      const changed = previousContentRef.current !== trimmedText;
      setShouldBeCollapsible(isLong);
      if (changed) {
        setIsCollapsed(isLong);
        previousContentRef.current = trimmedText;
      }
    }
  }, [trimmedText]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const parts = [
      ...normalisedBlocks.map((b) => `[${b.label}: ${b.title}]`),
      trimmedText,
    ].filter(Boolean);
    navigator.clipboard.writeText(parts.join("\n")).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (!hasContent) return null;

  const containerMargin = compact ? "" : "ml-12";

  return (
    <div className={containerMargin}>
      <div className="bg-muted border border-border rounded-lg">
        {/* Header row — copy button + collapse indicator */}
        <div
          className="flex items-center justify-end px-2 pt-1 pb-0 cursor-pointer rounded-lg"
          onClick={() => shouldBeCollapsible && setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0 text-muted-foreground"
              title="Copy"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="px-2 pb-2 relative">
          <div className="space-y-1.5">
            {/* Attachment chips row — inside the bubble */}
            {normalisedBlocks.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {normalisedBlocks.map((block) => (
                  <AttachmentChip key={block.key} block={block} />
                ))}
              </div>
            )}

            {/* Text content */}
            {trimmedText && (
              <div className="relative">
                <div
                  ref={measureRef}
                  className={cn(
                    "text-xs text-foreground whitespace-pre-wrap break-words overflow-hidden transition-all duration-300",
                    shouldBeCollapsible && isCollapsed && "max-h-12",
                  )}
                >
                  {trimmedText}
                </div>

                {shouldBeCollapsible && isCollapsed && (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-muted via-muted/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCollapsed(false);
                        }}
                        className="h-6 w-6 p-0 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Expand message"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
