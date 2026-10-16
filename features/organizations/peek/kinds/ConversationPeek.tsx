"use client";

/**
 * ConversationPeek — quick read-only preview of a conversation on THE peek (`Peek` in `PeekWindow`).
 *
 * A failed read is the design system's failed-read notice with Try again (`failure`); no row is
 * "Conversation not found."; the description keeps "No description"; the date is shown; the organization's custom
 * fields ride along; Open / Open in new tab come from `useRecordPeekDoors`.
 */

import React from "react";
import { MessagesSquare } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface ConversationRow {
  title: string | null;
  description: string | null;
  created_at: string | null;
}

export default function ConversationPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<ConversationRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<unknown>(null);
  const [attempt, setAttempt] = React.useState(0);
  const doors = useRecordPeekDoors({ token: "conversation", id, href: peekHref("conversation", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .schema("chat").from("conversation")
        .select("title, description, created_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setLoadError(error ?? null);
        setRow((data as ConversationRow) ?? null);
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
    body.push({ property: "Started", value: row.created_at ? new Date(row.created_at).toLocaleString() : "—" });
    body.push({ part: "custom-fields", token: "conversation", id });
  } else if (!loading && !loadError) {
    body.push({ fact: "Conversation not found." });
  }

  const title = row?.title || "Conversation";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek
        size="lg"
        record={{
          kind: "Conversation",
          id,
          title,
          glyph: MessagesSquare,
          body,
          ...doors,
          failure: loadError ? { what: "this conversation", error: loadError, onRetry: () => setAttempt((n) => n + 1) } : undefined,
        }}
        loading={loading}
      />
    </PeekWindow>
  );
}
