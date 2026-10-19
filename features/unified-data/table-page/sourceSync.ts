// features/unified-data/table-page/sourceSync.ts — the pure words of a synced-source Sync now (lane AT-SYNC).

/** source_kind in custom.synced_source → the words and the aidream door for its Sync now. */
export const SYNC_SOURCES: Record<string, { name: string; path: string }> = {
  airtable_base: { name: "Airtable", path: "/airtable-import/sync" },
  github_issues: { name: "GitHub", path: "/github-sync/sync" },
};

export interface SyncReport {
  added?: number; updated?: number; archived?: number; conflicts?: unknown[]; notices?: string[];
  /** Rows the source no longer lists, held by the archive guard (nothing archived), and their exact confirmation. */
  archive_held?: number | null; archive_confirm?: string | null; archive_kept?: string | null;
}

/** What one finished sync says, in a sentence. */
export function syncSentence(name: string, r: SyncReport): string {
  const parts = [`${r.added ?? 0} added`, `${r.updated ?? 0} updated`];
  if (r.archived) parts.push(`${r.archived} archived`);
  const c = r.conflicts?.length ?? 0;
  return `${name} synced: ${parts.join(", ")}${c ? `, ${c} kept yours (${name}'s version is a comment on the row)` : ""}.`;
}
