"use client";

/**
 * SavedArtifactEdit — the write path of a MATERIALIZED artifact inside an
 * editable answer (Arman, 2026-10-16: Controls appear wherever a block renders
 * and can be saved, chat answers included; a change saves that answer like a
 * hand edit, and undo works the same).
 *
 * A materialized `<artifact id=uuid>` draws its `canvas_items` row by id
 * (ArtifactRefBlock), while the answer keeps the same text inside the tag as
 * its archive. The block's own write path (BlockRenderer's BlockEditProvider)
 * only reaches the answer, so a Controls change saved the archive — and queued
 * the edit chip — while the row on screen, and after reload, never changed
 * (live, 2026-10-17: pie → Bar stayed a pie).
 *
 * This provider re-points the block's write at the row's text: one change
 *  1. shows at once (the drawn text is replaced locally),
 *  2. saves the answer through the host's write — THE hand-edit save
 *     (`saveAnswerEdit`: content history, the edit chip), and
 *  3. saves the row the screen draws (`canvasItemsService.update`), so a
 *     reload draws the change too.
 * Every change offers Undo, which writes the previous text back the same way.
 *
 * Only a text payload the answer's archive still holds can be saved in both
 * places; otherwise the block gets no write path and shows no Controls (never
 * a change that saves in one place only).
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BlockEditProvider, useBlockEdit } from "@ai-matrx/rich-content/display/block-controls/block-edit";
import { invalidateCanvasItemCache } from "@/features/canvas/hooks/useCanvasItem";
import { canvasItemsService, type UpdateCanvasItemInput } from "@/features/canvas/services/canvasItemsService";
import { toast } from "@/lib/toast";

interface SavedArtifactEditProps {
  rowId: string;
  /** The row's text payload as drawn (`content.data`, or the whole string content). */
  raw: string;
  /** The row's stored `content` (`{ data, type, metadata }` or a string). */
  stored: unknown;
  children: (shownRaw: string) => ReactNode;
}

export function SavedArtifactEdit({ rowId, raw, stored, children }: SavedArtifactEditProps) {
  const answer = useBlockEdit();
  const [shown, setShown] = useState<{ rowId: string; raw: string } | null>(null);
  const shownRaw = shown?.rowId === rowId ? shown.raw : raw;
  const textPayload =
    typeof stored === "string" ||
    (stored !== null && typeof stored === "object" && typeof (stored as { data?: unknown }).data === "string");
  const writable = Boolean(answer && textPayload && shownRaw && answer.source.includes(shownRaw));

  // Toast actions run after later renders: they read the latest values here.
  const latest = useRef({ answer, shownRaw, stored, rowId, writable });
  useLayoutEffect(() => {
    latest.current = { answer, shownRaw, stored, rowId, writable };
  });

  const write = (next: string, undoable: boolean) => {
    const now = latest.current;
    if (!now.answer || !now.writable || next === now.shownRaw) return;
    const prev = now.shownRaw;
    setShown({ rowId: now.rowId, raw: next });
    // Optimistic: the next render sees the new text before the effect runs.
    latest.current = { ...now, shownRaw: next };
    now.answer.write(now.answer.source.replace(prev, next));
    const content = (
      typeof now.stored === "string" ? next : { ...(now.stored as Record<string, unknown>), data: next }
    ) as UpdateCanvasItemInput["content"];
    void canvasItemsService.update(now.rowId, { content }).then(({ error }) => {
      invalidateCanvasItemCache(now.rowId);
      if (error) {
        toast.error("The change was not saved to the saved artifact.", {
          description: error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error),
        });
      }
    });
    if (undoable) {
      toast.success("Answer saved", { action: { label: "Undo", onClick: () => write(prev, false) } });
    }
  };

  return (
    <BlockEditProvider source={writable ? shownRaw : null} replace={writable ? (_source: string, next: string) => write(next, true) : null}>
      {children(shownRaw)}
    </BlockEditProvider>
  );
}
