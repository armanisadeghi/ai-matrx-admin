"use client";

/**
 * FlashcardPeek — quick read-only preview of an education.fc_set row, on THE peek (`Peek` in `PeekWindow`).
 */

import React from "react";
import { Layers } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface FlashcardRow {
  name: string | null;
  topic: string | null;
  created_at: string | null;
}

export default function FlashcardPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<FlashcardRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "fc_set", id, href: peekHref("fc_set", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .schema("education")
        .from("fc_set")
        .select("name, topic, created_at")
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as FlashcardRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const body: PeekBlock[] = [];
  if (row) {
    body.push({ property: "Name", value: row.name ?? "—" });
    body.push({ property: "Topic", value: row.topic ?? "—" });
    body.push({ property: "Created", value: row.created_at ? new Date(row.created_at).toLocaleString() : "—" });
    body.push({ part: "custom-fields", token: "fc_set", id });
  } else if (!loading) {
    body.push({ fact: "Flashcard not found." });
  }

  const title = row?.name || row?.topic || "Flashcard deck";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: "Flashcard deck", id, title, glyph: Layers, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
