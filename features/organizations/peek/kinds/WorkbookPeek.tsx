"use client";

/**
 * WorkbookPeek — read-only preview of a workbook. On THE peek (`Peek` in `PeekWindow`).
 * Titled by `workbook_name` — the registry's title column (guard:
 * `__tests__/every-peek-shows-the-record-name.test.tsx`).
 */

import React from "react";
import { Sheet } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface WorkbookRow {
  workbook_name: string | null;
  description: string | null;
  created_at: string | null;
}

export default function WorkbookPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<WorkbookRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "workbook", id, href: peekHref("workbook", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .schema("workbench")
        .from("udt_workbooks")
        .select("workbook_name, description, created_at")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as WorkbookRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const body: PeekBlock[] = [];
  if (row) {
    if (row.description && row.description !== row.workbook_name) {
      body.push({ section: "Description", text: row.description });
    }
    body.push({ fact: `Created ${row.created_at ? new Date(row.created_at).toLocaleString() : "—"}`, muted: true });
    body.push({ part: "custom-fields", token: "workbook", id });
  } else if (!loading) {
    body.push({ part: "access", token: "workbook", id });
  }

  const title = row?.workbook_name || row?.description || "Workbook";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: "Workbook", id, title, glyph: Sheet, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
