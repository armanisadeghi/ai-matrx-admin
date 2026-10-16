"use client";

/** SkillPeek — read-only preview of a skill definition. On THE peek (`Peek` in `PeekWindow`). */

import React from "react";
import { Puzzle } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface Row {
  label: string | null;
  description: string | null;
  created_at: string | null;
}

export default function SkillPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<Row | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<unknown>(null);
  const [attempt, setAttempt] = React.useState(0);
  const doors = useRecordPeekDoors({ token: "skill", id, href: peekHref("skill", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .schema("skill")
        .from("definition")
        .select("label, description, created_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setLoadError(error ?? null);
        setRow((data as Row) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const description = row?.description ?? "";
  const body: PeekBlock[] = [];
  if (row && !loadError) {
    body.push(
      description.trim()
        ? { section: "Description", text: description, markdown: true }
        : { section: "Description", text: "No description" },
    );
    body.push({ fact: `Added ${row.created_at ? new Date(row.created_at).toLocaleString() : "—"}`, muted: true });
    body.push({ part: "custom-fields", token: "skill", id });
  } else if (!loading && !loadError) {
    body.push({ fact: "Skill not found.", wrap: true });
  }

  const title = row?.label || "Skill";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek
        size="lg"
        record={{
          kind: "Skill",
          id,
          title,
          glyph: Puzzle,
          body,
          ...(loadError ? { failure: { what: "this skill", error: loadError, onRetry: () => setAttempt((n) => n + 1) } } : {}),
          ...doors,
        }}
        loading={loading}
      />
    </PeekWindow>
  );
}
