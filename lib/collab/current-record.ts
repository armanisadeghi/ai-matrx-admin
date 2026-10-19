/**
 * The Doc / Sheet readers every non-editor surface shares: the record's CURRENT content (room folded to head when
 * people are co-editing, else the newest snapshot), with a plain-words toast when it falls back to an older copy.
 * One place for the snapshot door + the fold, so no reader repeats either (see ./current-content.ts).
 */
import { getLatestDocumentSnapshot } from "@ai-matrx/office/docs";
import { getLatestSnapshot } from "@ai-matrx/office/sheets";

import { isServiceFailure } from "@/features/data-tables/types";
import { announceIfStale, readCurrentContent, type CurrentContent } from "@/lib/collab/current-content";

/** Throws the service's own error when the snapshot door fails; `snapshot: null` = no saved content at all. */
export async function readCurrentWorkbook(workbookId: string, opts: { announce?: boolean } = {}): Promise<CurrentContent> {
  const content = await readCurrentContent("workbook", workbookId, async () => {
    const res = await getLatestSnapshot(workbookId);
    if (isServiceFailure(res)) throw new Error(res.error);
    return res.data?.snapshot ?? null;
  });
  return opts.announce === false ? content : announceIfStale(content);
}

export async function readCurrentDocument(documentId: string, opts: { announce?: boolean } = {}): Promise<CurrentContent> {
  const content = await readCurrentContent("udt_document", documentId, async () => {
    const res = await getLatestDocumentSnapshot(documentId);
    if (!res.success) throw new Error(res.error);
    return res.data?.snapshot ?? null;
  });
  return opts.announce === false ? content : announceIfStale(content);
}

/** The document's current content as markdown (export, compare, citations). `null` = no saved content. */
export async function readCurrentDocumentMarkdown(documentId: string): Promise<string | null> {
  const { snapshot } = await readCurrentDocument(documentId);
  if (!snapshot) return null;
  const { univerDocToMarkdown } = await import("@ai-matrx/office/docs/io");
  return univerDocToMarkdown(snapshot as Parameters<typeof univerDocToMarkdown>[0]);
}
