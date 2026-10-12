/**
 * The scopes of the Workbooks and Documents homes — Google's owner filter ("Owned by anyone / by
 * me / not by me") plus Starred and Trash, presented by `FileHome`'s Recent header.
 */

export type FileScope = "all" | "mine" | "shared" | "starred" | "trash";

/** Pure scope filter for rows that carry `user_id`. */
export function filterByScope<T extends { id: string; user_id: string }>(
  rows: readonly T[],
  scope: FileScope,
  userId: string | null,
  starredIds: ReadonlySet<string>,
): T[] {
  switch (scope) {
    case "mine":
      return rows.filter((r) => r.user_id === userId);
    case "shared":
      return rows.filter((r) => r.user_id !== userId);
    case "starred":
      return rows.filter((r) => starredIds.has(r.id));
    default:
      return [...rows];
  }
}
