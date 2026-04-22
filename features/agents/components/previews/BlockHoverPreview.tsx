"use client";

/**
 * Smart hover preview for an attached resource "block" inside a user message.
 *
 * A block (`RenderBlockPayload`) usually represents a typed input — notes,
 * tasks, urls, data refs — and may contain one or many items. This component
 * dispatches to the right per-item preview content and stacks multiple items
 * compactly when needed. No fetch — all data is read from Redux.
 *
 * For block types we don't have a dedicated preview for (image, audio,
 * video, document, table, list), the children are rendered without a hover
 * wrapper so existing click-modal behavior is preserved.
 */

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectNotesMap } from "@/features/notes/redux/selectors";
import { selectAllTasks } from "@/features/agent-context/redux/tasksSlice";
import { cn } from "@/lib/utils";
import { CheckSquare, Globe, StickyNote } from "lucide-react";
import { NotePreviewContent } from "./NoteHoverPreview";
import { TaskPreviewContent } from "./TaskHoverPreview";
import { WebpagePreviewContent } from "./WebpageHoverPreview";
import { DataRefPreviewContent } from "./DataRefHoverPreview";
import type { DataRef } from "@/features/agents/types/message-types";
import type { RenderBlockPayload } from "@/types/python-generated/stream-events";

type Block = RenderBlockPayload;

function getNoteIds(block: Block): string[] {
  const ids = (block.data as { note_ids?: unknown })?.note_ids;
  return Array.isArray(ids) ? (ids as string[]) : [];
}
function getTaskIds(block: Block): string[] {
  const ids = (block.data as { task_ids?: unknown })?.task_ids;
  return Array.isArray(ids) ? (ids as string[]) : [];
}
function getUrls(block: Block): string[] {
  const urls = (block.data as { urls?: unknown })?.urls;
  return Array.isArray(urls) ? (urls as string[]) : [];
}
function getDataRefs(block: Block): DataRef[] {
  const refs = (block.data as { refs?: unknown })?.refs;
  return Array.isArray(refs) ? (refs as DataRef[]) : [];
}

// ── Compact list rows for multi-item blocks ────────────────────────────────

function NoteListRow({ noteId }: { noteId: string }) {
  const note = useAppSelector(
    (s) => selectNotesMap(s)[noteId] as { label?: string } | undefined,
  );
  return (
    <li className="flex items-center gap-1.5 text-xs">
      <StickyNote className="w-3 h-3 text-orange-500 shrink-0" />
      <span className="truncate text-foreground">
        {note?.label?.trim() || "Untitled"}
      </span>
    </li>
  );
}

function TaskListRow({ taskId }: { taskId: string }) {
  const task = useAppSelector((s) => {
    const all = selectAllTasks(s as Parameters<typeof selectAllTasks>[0]);
    return all.find((t) => t.id === taskId);
  });
  return (
    <li className="flex items-center gap-1.5 text-xs">
      <CheckSquare className="w-3 h-3 text-blue-500 shrink-0" />
      <span className="truncate text-foreground">
        {task?.title?.trim() || "Untitled task"}
      </span>
    </li>
  );
}

function WebpageListRow({ url }: { url: string }) {
  let domain = url;
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* noop */
  }
  return (
    <li className="flex items-center gap-1.5 text-xs">
      <Globe className="w-3 h-3 text-teal-500 shrink-0" />
      <span className="truncate text-foreground/90 font-mono">{domain}</span>
    </li>
  );
}

function MultiItemList({
  count,
  label,
  children,
}: {
  count: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        {count} {label}
      </div>
      <ul className="space-y-1 max-h-60 overflow-y-auto -mr-2 pr-2">
        {children}
      </ul>
    </div>
  );
}

// ── Per-block content dispatcher ───────────────────────────────────────────

function BlockPreviewBody({ block }: { block: Block }) {
  switch (block.type) {
    case "input_notes": {
      const ids = getNoteIds(block);
      if (ids.length === 0) {
        return <EmptyNote />;
      }
      if (ids.length === 1) {
        return <NotePreviewContent noteId={ids[0]} />;
      }
      return (
        <MultiItemList count={ids.length} label="notes">
          {ids.map((id) => (
            <NoteListRow key={id} noteId={id} />
          ))}
        </MultiItemList>
      );
    }
    case "input_task": {
      const ids = getTaskIds(block);
      if (ids.length === 0) return <EmptyTask />;
      if (ids.length === 1) return <TaskPreviewContent taskId={ids[0]} />;
      return (
        <MultiItemList count={ids.length} label="tasks">
          {ids.map((id) => (
            <TaskListRow key={id} taskId={id} />
          ))}
        </MultiItemList>
      );
    }
    case "input_webpage": {
      const urls = getUrls(block);
      if (urls.length === 0) return <EmptyValue label="webpages" />;
      if (urls.length === 1) return <WebpagePreviewContent url={urls[0]} />;
      return (
        <MultiItemList count={urls.length} label="webpages">
          {urls.map((u) => (
            <WebpageListRow key={u} url={u} />
          ))}
        </MultiItemList>
      );
    }
    case "input_data": {
      const refs = getDataRefs(block);
      if (refs.length === 0) return <EmptyValue label="data references" />;
      if (refs.length === 1) return <DataRefPreviewContent ref={refs[0]} />;
      return (
        <MultiItemList count={refs.length} label="data refs">
          {refs.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-1.5 text-xs text-foreground"
            >
              <span className="font-semibold">{r.table}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground capitalize">
                {r.ref_type.replace(/^db_/, "")}
              </span>
            </li>
          ))}
        </MultiItemList>
      );
    }
    default:
      return null;
  }
}

function EmptyValue({ label }: { label: string }) {
  return (
    <div className="text-xs text-muted-foreground italic">
      No {label} attached.
    </div>
  );
}
function EmptyNote() {
  return <EmptyValue label="notes" />;
}
function EmptyTask() {
  return <EmptyValue label="tasks" />;
}

// ── Public wrapper ─────────────────────────────────────────────────────────

const PREVIEWABLE_TYPES = new Set([
  "input_notes",
  "input_task",
  "input_webpage",
  "input_data",
]);

interface BlockHoverPreviewProps {
  block: Block;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  openDelay?: number;
  closeDelay?: number;
  className?: string;
}

/**
 * Wraps a chip in a hover popover when the block type has a preview
 * implementation. For other block types the children are returned as-is so
 * existing click-modal behaviour is preserved.
 */
export function BlockHoverPreview({
  block,
  children,
  side = "top",
  align = "start",
  openDelay = 250,
  closeDelay = 140,
  className,
}: BlockHoverPreviewProps) {
  if (!PREVIEWABLE_TYPES.has(block.type)) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        sideOffset={8}
        className={cn(
          "w-80 p-3 bg-card border border-border shadow-lg",
          className,
        )}
      >
        <BlockPreviewBody block={block} />
      </HoverCardContent>
    </HoverCard>
  );
}
