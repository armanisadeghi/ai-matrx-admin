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

  useChannel(
    id
      ? {
          topic: fileNameChannel.topic({ table, id }),
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
