/**
 * components/official/topic-tree/geometry.tsx — THE tree geometry of this app.
 *
 * Arman, 2026-10-07: "things in a tree must have proper indentation … we have to
 * properly and clearly show a difference between things of different types such as
 * folders and files … pick a great one and make this a duplicate of it." The great
 * one is the macOS Finder list view (VS Code's explorer lands on the same numbers):
 *
 *   - one level = 16px, always;
 *   - every row keeps a 16px disclosure slot, empty on a leaf, so a file's icon sits
 *     on the same vertical line as a sibling folder's icon;
 *   - a 16px type icon on every row: a solid blue folder vs. a document glyph;
 *   - body text (13px), one row height (28px compact).
 *
 * `TopicTree` uses these. A tree that cannot use `TopicTree` (virtualised file
 * browsers, editors with inline rename) imports these instead of typing its own
 * numbers — `pnpm check:tree-indent` fails any `depth * <number>` indent.
 */

import type { CSSProperties } from "react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";

import { cn } from "@/lib/utils";

/** One depth step. 16px is the step Finder, VS Code and Linear all land on. */
export const TREE_INDENT_PX = 16;

/** Compact is the default everywhere; comfortable is for touch and presentation. */
export const TREE_ROW_HEIGHT = { compact: 28, comfortable: 36 } as const;

/** Left inset of a depth-0 row before its disclosure slot. */
export const TREE_ROW_INSET_PX = 4;

/** Row text: body size (13px). A tree is primary content, never secondary text. */
export const TREE_ROW_TEXT = "type-body";

/** Left padding for a row at `depth` — the only indent formula a tree may use. */
export function treeIndentPx(depth: number): number {
  return TREE_ROW_INSET_PX + Math.max(0, depth) * TREE_INDENT_PX;
}

/** `style` for a row at `depth`. */
export function treeIndentStyle(depth: number): CSSProperties {
  return { paddingLeft: treeIndentPx(depth) };
}

/**
 * The 16px disclosure slot. Renders the chevron when the row can expand and an
 * empty slot of the same width when it cannot — that empty slot is what keeps a
 * leaf aligned under its sibling folders.
 */
export function TreeDisclosure({
  expandable,
  expanded,
  onToggle,
  className,
}: {
  expandable: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  if (!expandable) {
    return <span aria-hidden="true" className={cn("h-4 w-4 shrink-0", className)} />;
  }
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      onClick={(event) => {
        event.stopPropagation();
        onToggle?.();
      }}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
    </button>
  );
}

/** Finder's folder: solid blue, 16px. Open variant for an expanded folder. */
export function TreeFolderIcon({ open = false, className }: { open?: boolean; className?: string }) {
  const Icon = open ? FolderOpen : Folder;
  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.5}
      className={cn("h-4 w-4 shrink-0 fill-sky-400/80 text-sky-500", className)}
    />
  );
}
