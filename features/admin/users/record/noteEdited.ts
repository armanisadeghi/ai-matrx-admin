/** A pin bumps updated_at too; the pin function stamps metadata.pinned_at, so only a later change is an edit. */
export function noteWasEdited(n: { created_at: string; updated_at: string; metadata: unknown }): boolean {
  const updated = Date.parse(n.updated_at);
  if (!(updated > Date.parse(n.created_at))) return false;
  const meta = n.metadata as { pinned_at?: unknown } | null;
  const pinnedAt = typeof meta?.pinned_at === "string" ? Date.parse(meta.pinned_at) : NaN;
  return !(pinnedAt >= updated);
}
