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
 *     (`saveAnswerEdit`: content history, the edit chip) — and THAT save writes
 *     the row the screen draws (`syncEditedArtifactRows`, a new version for a
 *     versioned type) and tells this block to re-read it. One path for every
 *     surface (desktop popover, phone sheet), never a second writer here: the
 *     direct row write this file used to make overwrote a versioned row in
 *     place and raced the answer save (review 6 H2, 2026-10-21).
 * Every change offers Undo, which writes the previous text back the same way.
 *
 * The answer's archive is found by the drawn text, or — when a save reached the
 * answer but not the row (the drawn row is behind) — by the archive body
 * (`archive`), so the block keeps its Controls and the next save brings the row
 * level again. Without either, the block gets no write path.
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BlockEditProvider, useBlockEdit } from "@ai-matrx/rich-content/display/block-controls/block-edit";
import { toast } from "@/lib/toast";

interface SavedArtifactEditProps {
  /**
   * The saved row the block draws, or null while there is none (a live block, a row still
   * loading): then the block's own answer write passes straight through. Rendering this provider
   * ALWAYS (row or not) keeps the drawn component under the same parent from the first token to
   * the saved answer — a provider that appeared only once the row loaded remounted it.
   */
  rowId: string | null;
  /** The row's text payload as drawn (`content.data`, or the whole string content). */
  raw: string;
  /** The row's stored `content` (`{ data, type, metadata }` or a string). */
  stored: unknown;
  /** The answer's own archive body inside the `<artifact>` tag (the ref's fallback content). */
  archive?: string;
  children: (shownRaw: string) => ReactNode;
}

export function SavedArtifactEdit({ rowId, raw, stored, archive, children }: SavedArtifactEditProps) {
  const answer = useBlockEdit();
  const [shown, setShown] = useState<{ rowId: string; raw: string } | null>(null);
  const shownRaw = shown?.rowId === rowId ? shown.raw : raw;
  const textPayload =
    typeof stored === "string" ||
    (stored !== null && typeof stored === "object" && typeof (stored as { data?: unknown }).data === "string");
  // Where the drawn text sits in the answer: itself, or the archive body when the row is behind.
  const base = !answer || !shownRaw ? null : answer.source.includes(shownRaw) ? shownRaw : archive && answer.source.includes(archive) ? archive : null;
  const writable = Boolean(rowId && answer && textPayload && shownRaw && base);

  // Toast actions run after later renders: they read the latest values here.
  const latest = useRef({ answer, shownRaw, base, rowId, writable });
  useLayoutEffect(() => {
    latest.current = { answer, shownRaw, base, rowId, writable };
  });

  const write = (next: string, undoable: boolean) => {
    const now = latest.current;
    const rowNow = now.rowId;
    if (!rowNow || !now.answer || !now.writable || !now.base || next === now.shownRaw) return;
    const prev = now.shownRaw;
    setShown({ rowId: rowNow, raw: next });
    // Optimistic: the next render sees the new text before the effect runs.
    latest.current = { ...now, shownRaw: next, base: next };
    // The answer save writes this row too (saveAnswerEdit → syncEditedArtifactRows) and says so
    // out loud when it cannot.
    now.answer.write(now.answer.source.replace(now.base, next));
    if (undoable) {
      toast.success("Answer saved", { action: { label: "Undo", onClick: () => write(prev, false) } });
    }
  };

  if (!rowId) {
    return (
      <BlockEditProvider source={answer?.source ?? null} replace={answer ? (_source: string, next: string) => answer.write(next) : null}>
        {children(raw)}
      </BlockEditProvider>
    );
  }
  return (
    <BlockEditProvider source={writable ? shownRaw : null} replace={writable ? (_source: string, next: string) => write(next, true) : null}>
      {children(shownRaw)}
    </BlockEditProvider>
  );
}
