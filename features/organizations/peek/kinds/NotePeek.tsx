"use client";

/**
 * NotePeek — the worked example of a record peek on THE peek (`Peek` in `PeekWindow`).
 *
 * Fetch the row, describe it as a `PeekRecord`, hand it to `Peek`. Everything the old dialog drew is
 * here: the note's name, its tags, its content (line breaks kept, first 2,000 characters, "…" past
 * that, "Empty note" when blank), when it was updated, the organization's custom fields (part
 * `custom-fields`), the access notice when it cannot be read (part `access`), Open (this tab) and Open
 * in new tab (`useRecordPeekDoors`). The floating window closes on ✕ or Escape and is a bottom drawer
 * on a phone.
 */

import React from "react";
import { NotebookText, Tag } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface NoteRow {
  label: string | null;
  content: string | null;
  tags: string[] | null;
  updated_at: string | null;
}

const MAX_PREVIEW = 2000;

export default function NotePeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<NoteRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "note", id, href: peekHref("note", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .schema("workbench").from("notes")
        .select("label, content, tags, updated_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as NoteRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const content = (row?.content ?? "").trim();
  const body: PeekBlock[] = [];
  if (row) {
    if (row.tags?.length) body.push({ section: "Tags", glyph: Tag, tags: row.tags });
    body.push(
      content
        ? { section: "Content", text: content.length > MAX_PREVIEW ? `${content.slice(0, MAX_PREVIEW)}…` : content, breaks: true }
        : { section: "Content", text: "Empty note" },
    );
    body.push({ fact: `Updated ${row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}`, muted: true });
    body.push({ part: "custom-fields", token: "note", id });
  } else if (!loading) {
    body.push({ part: "access", token: "note", id });
  }

  const title = row?.label || "Note";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: "Note", id, title, glyph: NotebookText, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
