/**
 * features/files/components/core/FileBadges/FileRagBadge.tsx
 *
 * Tiny inline indicator that a file is RAG-indexed (has a
 * `processed_documents` row) or that it's a derivation of another
 * file (`parentFileId`). Designed to live next to the filename in
 * dense list views — file table rows, grid cells, file-tree rows.
 *
 * Why a separate component:
 *   - Each row uses `useFileDocument(fileId)` which hits a memoised
 *     module-level cache, so rendering the badge across N rows is
 *     cheap (one network probe per file, ever, until invalidated).
 *   - Skipping virtual files at this layer keeps the call sites
 *     dumb: any row can drop in `<FileRagBadge fileId={…}/>` without
 *     branching on source.
 *
 * Renders nothing when:
 *   - The file is virtual (no cld_files.id to look up against).
 *   - The lookup hasn't returned yet (avoid layout shift on first
 *     paint of a long file list).
 *   - The file has no processed_document and no parentFileId.
 *
 * The badge is purely informational; click handlers live on the
 * row. We don't want a tiny pill stealing pointer events.
 */

"use client";

import { GitBranch, Sparkles } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFileById } from "@/features/files/redux/selectors";
import { useFileDocument } from "@/features/files/hooks/useFileDocument";
import { cn } from "@/lib/utils";

export interface FileRagBadgeProps {
  fileId: string;
  className?: string;
  /** Compact mode — no labels, just icons. Default true for dense lists. */
  iconOnly?: boolean;
}

export function FileRagBadge({
  fileId,
  className,
  iconOnly = true,
}: FileRagBadgeProps) {
  const file = useAppSelector((s) => selectFileById(s, fileId));
  const { state } = useFileDocument(fileId);

  // Virtual files don't have processed_documents (their content is
  // ingested via `source_kind: note | code_file`, not `cld_file`).
  if (!file || file.source.kind !== "real") return null;

  const isIndexed = state.status === "found";
  const isDerived = !!file.parentFileId;

  if (!isIndexed && !isDerived) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 align-middle",
        className,
      )}
      aria-label={
        isIndexed && isDerived
          ? "Indexed for RAG, derived from another file"
          : isIndexed
            ? "Indexed for RAG"
            : "Derived from another file"
      }
    >
      {isIndexed ? (
        <span
          title="Indexed for RAG search"
          className="inline-flex items-center gap-0.5 rounded-sm bg-primary/10 text-primary px-1 py-px text-[9px] font-semibold leading-none"
        >
          <Sparkles className="h-2.5 w-2.5" />
          {iconOnly ? null : <span>RAG</span>}
        </span>
      ) : null}
      {isDerived ? (
        <span
          title={`Derived from another file${file.derivationKind ? ` · ${file.derivationKind}` : ""}`}
          className="inline-flex items-center gap-0.5 rounded-sm bg-muted text-muted-foreground px-1 py-px text-[9px] font-semibold leading-none"
        >
          <GitBranch className="h-2.5 w-2.5" />
          {iconOnly ? null : <span>derived</span>}
        </span>
      ) : null}
    </span>
  );
}

export default FileRagBadge;
