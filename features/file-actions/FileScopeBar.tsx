"use client";

import { cn } from "@/lib/utils";

export type FileScope = "all" | "mine" | "shared" | "starred" | "trash";

const SCOPES: ReadonlyArray<{ value: FileScope; label: string }> = [
  { value: "all", label: "All" },
  { value: "mine", label: "Owned by me" },
  { value: "shared", label: "Shared with me" },
  { value: "starred", label: "Starred" },
  { value: "trash", label: "Trash" },
];

/** Drive-style scope chips shared by the Workbooks and Documents lists. */
export function FileScopeBar({
  scope,
  onChange,
}: {
  scope: FileScope;
  onChange: (scope: FileScope) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Show">
      {SCOPES.map((s) => (
        <button
          key={s.value}
          type="button"
          role="tab"
          aria-selected={scope === s.value}
          onClick={() => onChange(s.value)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            scope === s.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

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
