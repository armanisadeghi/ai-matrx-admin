"use client";

/** ShortcutPeek — quick read-only preview of an agent shortcut (description as formatted text, created date, custom fields, doors, not-found notice). On THE peek (`Peek` in `PeekWindow`). */

import React from "react";
import { Zap } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";
import { shortcutTable } from "@/lib/supabase/shortcutStorage";

interface Row {
  label: string | null;
  description: string | null;
  created_at: string | null;
}

export default function ShortcutPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<Row | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "agent_shortcut", id, href: peekHref("agent_shortcut", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await shortcutTable(supabase)
        .select("label, description, created_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as Row) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const body: PeekBlock[] = [];
  if (row) {
    body.push(
      row.description
        ? { section: "Description", text: row.description, markdown: true }
        : { section: "Description", text: "—" },
    );
    body.push({ fact: `Created ${row.created_at ? new Date(row.created_at).toLocaleString() : "—"}`, muted: true });
    body.push({ part: "custom-fields", token: "agent_shortcut", id });
  } else if (!loading) {
    body.push({ fact: "Shortcut not found.", wrap: true });
  }

  const title = row?.label || "Shortcut";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: "Shortcut", id, title, glyph: Zap, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
