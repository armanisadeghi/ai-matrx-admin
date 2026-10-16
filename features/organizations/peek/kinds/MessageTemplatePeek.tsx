"use client";

/**
 * MessageTemplatePeek — quick read-only preview for a message_template row, on THE peek.
 * The message_template table uses "label" as its title column. Content keeps its line breaks, first
 * 4,000 characters then "…", "Empty template" when blank; tags as chips; the access notice when unreadable.
 */

import React from "react";
import { LayoutTemplate, Tag } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface MessageTemplateRow {
  label: string | null;
  content: string | null;
  tags: string[] | null;
  created_at: string | null;
}

const MAX_PREVIEW = 4000;

export default function MessageTemplatePeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<MessageTemplateRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "message_template", id, href: peekHref("message_template", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .schema("agent")
        .from("message_template")
        .select("label, content, tags, created_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as MessageTemplateRow) ?? null);
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
    body.push(
      content
        ? { section: "Content", text: `${content.slice(0, MAX_PREVIEW)}${content.length > MAX_PREVIEW ? "…" : ""}`, breaks: true }
        : { section: "Content", text: "Empty template" },
    );
    if (row.tags && row.tags.length > 0) body.push({ section: "Tags", glyph: Tag, tags: row.tags });
    body.push({ property: "Created", value: row.created_at ? new Date(row.created_at).toLocaleString() : "—" });
    body.push({ part: "custom-fields", token: "message_template", id });
  } else if (!loading) {
    body.push({ part: "access", token: "message_template", id });
  }

  const title = row?.label || "Message Template";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: "Message template", id, title, glyph: LayoutTemplate, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
