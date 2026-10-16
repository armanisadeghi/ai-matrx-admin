// record-view: none — a pick list is a Deprecated table, which takes no custom fields
"use client";

/**
 * ListPeek — peek preview of a list, read through the list door (`custom.pick_list_get`), on THE peek.
 */

import React from "react";
import { List } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";
import { readPickList } from "@/features/data-tables/pick-lists/doors";

interface ListRow {
  description: string | null;
  created_at: string | null;
}

export default function ListPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<ListRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ id, href: peekHref("pick_list", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const doc = (await readPickList(supabase, id).catch(() => null)) as {
        description?: string | null;
        list_name?: string | null;
        created_at?: string;
      } | null;
      const found: ListRow | null =
        doc ? { description: doc.list_name ?? doc.description ?? null, created_at: doc.created_at ?? null } : null;
      if (!cancelled) {
        setRow(found);
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
  } else if (!loading) {
    body.push({ fact: "List not found." });
  }

  const title = row?.description || "List";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: "List", id, title, glyph: List, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
