"use client";

/** WorkflowPeek — quick read-only preview of a workflow. On THE peek (`Peek` in `PeekWindow`). */

import React from "react";
import { Workflow } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface WorkflowRow {
  name: string | null;
  description: string | null;
  created_at: string | null;
}

export default function WorkflowPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<WorkflowRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<unknown>(null);
  const [attempt, setAttempt] = React.useState(0);
  const doors = useRecordPeekDoors({ token: "workflow", id, href: peekHref("workflow", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // `workflow.definition` is the live model; the old `public.workflow` is in `deprecated`.
      const { data, error } = await supabase
        .schema("workflow")
        .from("definition")
        .select("name, description, created_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setLoadError(error ?? null);
        setRow((data as WorkflowRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const body: PeekBlock[] = [];
  if (row && !loadError) {
    body.push({ section: "Description", text: row.description ? row.description : "No description" });
    body.push({ fact: `Created ${row.created_at ? new Date(row.created_at).toLocaleString() : "—"}`, muted: true });
    body.push({ part: "custom-fields", token: "workflow", id });
  } else if (!loading && !loadError) {
    body.push({ fact: "Workflow not found.", wrap: true });
  }

  const title = row?.name || "Workflow";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek
        size="lg"
        record={{
          kind: "Workflow",
          id,
          title,
          glyph: Workflow,
          body,
          ...(loadError ? { failure: { what: "this workflow", error: loadError, onRetry: () => setAttempt((n) => n + 1) } } : {}),
          ...doors,
        }}
        loading={loading}
      />
    </PeekWindow>
  );
}
