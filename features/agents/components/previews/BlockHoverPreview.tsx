"use client";

/** Hover preview over the canonical, already-validated attachment item. */

import { PeekHoverCard } from "@ai-matrx/design-system";
import { NotePreviewContent } from "./NoteHoverPreview";
import { TaskPreviewContent } from "./TaskHoverPreview";
import { WebpagePreviewContent } from "./WebpageHoverPreview";
import { DataRefPreviewContent } from "./DataRefHoverPreview";
import {
  webpageTitle,
  webpageUrl,
} from "@/features/resource-manager/webpage/webpage-snapshot";
import type { ContextDrawerItem } from "@ai-matrx/chat/agents/components/context-items/types";

function PreviewBody({ item }: { item: ContextDrawerItem }) {
  const noteId = item.refs.noteIds?.[0];
  if (noteId) return <NotePreviewContent noteId={noteId} frame="surface" />;

  const taskId = item.refs.taskIds?.[0];
  if (taskId) return <TaskPreviewContent taskId={taskId} frame="surface" />;

  const webpage = item.refs.webpages?.[0];
  if (webpage) {
    return (
      <WebpagePreviewContent
        url={webpageUrl(webpage)}
        title={webpageTitle(webpage)}
        snippet={typeof webpage === "string" ? null : webpage.textContent}
        frame="surface"
      />
    );
  }

  const dataRef = item.refs.dataRefs?.[0];
  if (dataRef) return <DataRefPreviewContent dataRef={dataRef} frame="surface" />;

  return null;
}

function hasPreview(item: ContextDrawerItem): boolean {
  return !!(
    item.refs.noteIds?.length ||
    item.refs.taskIds?.length ||
    item.refs.webpages?.length ||
    item.refs.dataRefs?.length
  );
}

interface BlockHoverPreviewProps {
  item: ContextDrawerItem;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}

export function BlockHoverPreview({
  item,
  children,
  side = "top",
  align = "start",
}: BlockHoverPreviewProps) {
  if (!hasPreview(item)) return <>{children}</>;

  return (
    <PeekHoverCard
      trigger={<div className="inline-flex min-w-0">{children}</div>}
      side={side}
      align={align}
      label="Details"
    >
      <PreviewBody item={item} />
    </PeekHoverCard>
  );
}
