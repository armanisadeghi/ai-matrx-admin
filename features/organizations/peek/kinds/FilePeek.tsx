"use client";

/**
 * FilePeek — a file's type, size and date, with its thumbnail. On THE peek (`Peek` in `PeekWindow`).
 * The thumbnail is the stored file drawn by the app (`media.file`).
 */

import React from "react";
import { FileText } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { filesDb } from "@/features/files/filesDb";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";
import { formatFileSize } from "@ai-matrx/kit/format";

interface FileRow {
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string | null;
}

export default function FilePeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<FileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "file", id, href: peekHref("file", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await filesDb(supabase)
        .from("files")
        .select("file_name, mime_type, size_bytes, created_at")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as FileRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const body: PeekBlock[] = [];
  if (row) {
    body.push({ property: "Type", value: row.mime_type ?? "unknown" });
    body.push({ property: "Size", value: formatFileSize(row.size_bytes) });
    body.push({ property: "Added", value: row.created_at ? new Date(row.created_at).toLocaleString() : "—" });
    body.push({ part: "custom-fields", token: "file", id });
  } else if (!loading) {
    body.push({ part: "access", token: "file", id });
  }

  const title = row?.file_name ?? "File";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek
        size="lg"
        record={{
          kind: "File",
          id,
          title,
          glyph: FileText,
          ...(row ? { media: { alt: title, file: { id, ...(row.mime_type ? { mimeType: row.mime_type } : {}) } } } : {}),
          body,
          ...doors,
        }}
        loading={loading}
      />
    </PeekWindow>
  );
}
