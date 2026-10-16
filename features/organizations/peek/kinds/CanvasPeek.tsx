"use client";

/**
 * CanvasPeek — quick read-only preview of a canvas item on THE peek (`Peek` in `PeekWindow`).
 *
 * A failed read is the design system's failed-read notice with Try again (`failure`); no row is
 * "Canvas not found."; the description keeps "No description"; the date is shown; the organization's custom
 * fields ride along; Open / Open in new tab come from `useRecordPeekDoors`.
 */

import React from "react";
import { Frame } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface CanvasRow {
  title: string | null;
  description: string | null;
  created_at: string | null;
}

export default function CanvasPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<CanvasRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<unknown>(null);
  const [attempt, setAttempt] = React.useState(0);
  const doors = useRecordPeekDoors({ token: "canvas_item", id, href: peekHref("canvas_item", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .schema("canvas").from("canvas_items")
        .select("title, description, created_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setLoadError(error ?? null);
        setRow((data as CanvasRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const body: PeekBlock[] = [];
  if (row) {
    body.push({ section: "Description", text: row.description || "No description" });
    body.push({ property: "Created", value: row.created_at ? new Date(row.created_at).toLocaleString() : "—" });
    body.push({ part: "custom-fields", token: "canvas_item", id });
  } else if (!loading && !loadError) {
    body.push({ fact: "Canvas not found." });
  }

  const title = row?.title || "Canvas";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek
        size="lg"
        record={{
          kind: "Canvas",
          id,
          title,
          glyph: Frame,
          body,
          ...doors,
          failure: loadError ? { what: "this canvas", error: loadError, onRetry: () => setAttempt((n) => n + 1) } : undefined,
        }}
        loading={loading}
      />
    </PeekWindow>
  );
}
