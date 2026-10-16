"use client";

/**
 * QuizPeek — peek preview for quiz_sessions, on THE peek (`Peek` in `PeekWindow`).
 */

import React from "react";
import { ListChecks } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface QuizRow {
  title: string | null;
  created_at: string | null;
}

export default function QuizPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<QuizRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "quiz_session", id, href: peekHref("quiz_session", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .schema("education")
        .from("quiz_sessions")
        .select("title, created_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as QuizRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const body: PeekBlock[] = [];
  if (row) {
    body.push({ property: "Created", value: row.created_at ? new Date(row.created_at).toLocaleString() : "—" });
    body.push({ part: "custom-fields", token: "quiz_session", id });
  } else if (!loading) {
    body.push({ fact: "Quiz not found." });
  }

  const title = row?.title || "Quiz";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: "Quiz", id, title, glyph: ListChecks, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
