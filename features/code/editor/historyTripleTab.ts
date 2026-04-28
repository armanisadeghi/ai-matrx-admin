/**
 * historyTripleTab — id helpers for the `"history-triple"` tab kind.
 *
 * Tabs of this kind are read-only and lookup-keyed by
 * `(messageId, fileIdentityKey)`. The id encodes both so the tab
 * survives a full reload as long as the underlying snapshot is in
 * Supabase.
 *
 * Format:  history-triple:<messageId>:<fileIdentityKey>
 *          where fileIdentityKey is "<adapter>:<path>".
 */

export const HISTORY_TRIPLE_TAB_PREFIX = "history-triple:";

export function buildHistoryTripleTabId(
  messageId: string,
  fileIdentityKey: string,
): string {
  return `${HISTORY_TRIPLE_TAB_PREFIX}${messageId}:${fileIdentityKey}`;
}

export function isHistoryTripleTabId(id: string): boolean {
  return id.startsWith(HISTORY_TRIPLE_TAB_PREFIX);
}

/**
 * Inverse of `buildHistoryTripleTabId`. Returns null when the id
 * doesn't match the expected shape — caller should fall back to the
 * default editor render.
 */
export function parseHistoryTripleTabId(id: string): {
  messageId: string;
  fileIdentityKey: string;
} | null {
  if (!isHistoryTripleTabId(id)) return null;
  const rest = id.slice(HISTORY_TRIPLE_TAB_PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep <= 0) return null;
  const messageId = rest.slice(0, sep);
  const fileIdentityKey = rest.slice(sep + 1);
  if (!fileIdentityKey || !fileIdentityKey.includes(":")) return null;
  return { messageId, fileIdentityKey };
}
