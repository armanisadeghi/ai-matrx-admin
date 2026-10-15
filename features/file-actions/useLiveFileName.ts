"use client";

/**
 * A file's name, live: a collaborator's rename (or an agent's) shows in every
 * open editor of that record without a reload — Google's title behaviour.
 * Row UPDATEs on the record's own table (both are in the realtime
 * publication); the payload's name column is the only thing read.
 */

import { useCallback } from "react";

import { defineChannelNamespace } from "@ai-matrx/realtime";
import { useChannel } from "@ai-matrx/realtime/react";

import { createClient } from "@/utils/supabase/client";

const fileNameChannel = defineChannelNamespace({
  namespace: "file-record-name",
  parts: ["table", "id"],
  description: "renames of one workbench file record (udt_workbooks / udt_documents / presentation)",
});

export function useLiveFileName(
  target: {
    table: "udt_workbooks" | "udt_documents" | "presentation";
    column: "workbook_name" | "document_name" | "name";
    id: string | null;
  },
  onName: (name: string) => void,
) {
  const { table, column, id } = target;
  const emit = useCallback(
    (row: Record<string, unknown> | null) => {
      const next = row?.[column];
      if (typeof next === "string" && next.trim()) onName(next);
    },
    [column, onName],
  );

  // Realtime has no replay: after a dropped socket, a tab wake or a network restore the title is one
  // read away from correct. Without this the channel warns `channel.backfill.missing` on every editor.
  const rereadName = useCallback(() => {
    if (!id) return;
    void createClient()
      .schema("workbench")
      .from(table)
      .select(column)
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => emit((data as unknown as Record<string, unknown> | null) ?? null));
  }, [table, column, id, emit]);

  useChannel(
    id
      ? {
          topic: fileNameChannel.topic({ table, id }),
          onBackfill: rereadName,
          postgresChanges: [
            {
              event: "UPDATE",
              schema: "workbench",
              table,
              filter: `id=eq.${id}`,
              rowId: (row) => (typeof row.id === "string" ? row.id : undefined),
              onChange: ({ row }) => emit(row as Record<string, unknown> | null),
            },
          ],
        }
      : null,
  );
}
