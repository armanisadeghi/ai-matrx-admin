/**
 * features/agent-connections/components/sections/renderBlockTree.tsx — the rows
 * of the Render Blocks list, as pure data for the canonical TopicTree.
 *
 * Arman, 2026-10-07: trees indent properly, folders and files look different,
 * one clean size — a duplicate of the Finder list view. The geometry (16px per
 * level, the empty disclosure slot that lines a block up under its sibling
 * folders, 13px rows) lives in TopicTree / topic-tree/geometry; this module only
 * decides WHICH rows exist, in what order, at what depth, with which type icon.
 */
import type React from "react";
import { Component, FileCode2, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TopicTreeRow } from "@/components/official/topic-tree/types";
import { TreeFolderIcon } from "@/components/official/topic-tree/geometry";
import type { CategoryTreeNode } from "../../redux/skl/selectors";
import type { SklRenderDefinition } from "../../redux/skl/types";

/*
 * The list is a Finder list view on the canonical TopicTree: one 16px step per
 * level, a reserved disclosure slot so a block's icon lines up under its sibling
 * folders, a type icon on every row (filled folder vs. a per-format document)
 * and a fixed "Kind" column. Folders sit above blocks, as Finder and VS Code
 * sort them. Selecting a block opens it in the preview pane beside the list.
 */
export const FOLDER_PREFIX = "folder:";
export const UNCATEGORIZED_ID = `${FOLDER_PREFIX}__uncategorized`;
export const KIND_COLUMN = "block w-24 shrink-0";
/** Shown only while the list has the whole pane (no block open). */
export const DESCRIPTION_COLUMN = "hidden md:block w-56 xl:w-80 shrink-0 pr-4";

export const BLOCK_KIND: Record<
  SklRenderDefinition["blockType"],
  { label: string; icon: React.ReactNode }
> = {
  markdown: {
    label: "Markdown",
    icon: <FileText className="h-4 w-4 text-muted-foreground" />,
  },
  xml: {
    label: "XML",
    icon: <FileCode2 className="h-4 w-4 text-orange-500" />,
  },
  render_kind: {
    label: "Component",
    icon: <Component className="h-4 w-4 text-violet-500" />,
  },
};

function metaCells(
  kind: string,
  description: string | null | undefined,
  wide: boolean,
) {
  return (
    <>
      {wide && (
        <span className={cn(DESCRIPTION_COLUMN, "truncate")}>
          {description}
        </span>
      )}
      <span className={cn(KIND_COLUMN, "truncate")}>{kind}</span>
    </>
  );
}

function blockRow(
  def: SklRenderDefinition,
  depth: number,
  parentId: string | null,
  selectedItemId: string | null,
  wide: boolean,
): TopicTreeRow {
  const kind = BLOCK_KIND[def.blockType] ?? BLOCK_KIND.markdown;
  return {
    id: def.id,
    parentId,
    depth,
    label: def.label,
    description: def.description,
    hasChildren: false,
    expanded: false,
    selected: def.id === selectedItemId,
    icon: kind.icon,
    meta: metaCells(kind.label, def.description, wide),
    trailing: !def.isActive ? (
      <span className="type-meta text-muted-foreground">Inactive</span>
    ) : undefined,
  };
}

/** True when the folder, or any folder under it, holds a matching block. */
function branchHasMatch(
  node: CategoryTreeNode,
  byCategoryId: Record<string, SklRenderDefinition[]>,
  matches: (d: SklRenderDefinition) => boolean,
): boolean {
  if ((byCategoryId[node.category.id] ?? []).some(matches)) return true;
  return node.children.some((c) => branchHasMatch(c, byCategoryId, matches));
}

function countBlocks(
  node: CategoryTreeNode,
  byCategoryId: Record<string, SklRenderDefinition[]>,
  matches: (d: SklRenderDefinition) => boolean,
): number {
  return (
    (byCategoryId[node.category.id] ?? []).filter(matches).length +
    node.children.reduce((n, c) => n + countBlocks(c, byCategoryId, matches), 0)
  );
}

export function flattenTree({
  categoryTree,
  byCategoryId,
  matches,
  isExpanded,
  selectedItemId,
  wide,
}: {
  wide: boolean;
  categoryTree: CategoryTreeNode[];
  byCategoryId: Record<string, SklRenderDefinition[]>;
  matches: (d: SklRenderDefinition) => boolean;
  isExpanded: (folderId: string) => boolean;
  selectedItemId: string | null;
}): TopicTreeRow[] {
  const rows: TopicTreeRow[] = [];

  const pushFolder = (
    id: string,
    label: string,
    depth: number,
    parentId: string | null,
    count: number,
  ) => {
    const expanded = isExpanded(id);
    rows.push({
      id,
      parentId,
      depth,
      label,
      hasChildren: true,
      expanded,
      selected: false,
      icon: <TreeFolderIcon open={expanded} />,
      meta: metaCells(`${count} ${count === 1 ? "item" : "items"}`, null, wide),
    });
    return expanded;
  };

  const walk = (
    node: CategoryTreeNode,
    depth: number,
    parentId: string | null,
  ) => {
    if (!branchHasMatch(node, byCategoryId, matches)) return;
    const id = FOLDER_PREFIX + node.category.id;
    const open = pushFolder(
      id,
      node.category.label,
      depth,
      parentId,
      countBlocks(node, byCategoryId, matches),
    );
    if (!open) return;
    for (const child of node.children) walk(child, depth + 1, id);
    for (const def of (byCategoryId[node.category.id] ?? []).filter(matches)) {
      rows.push(blockRow(def, depth + 1, id, selectedItemId, wide));
    }
  };

  for (const node of categoryTree) walk(node, 0, null);

  const loose = (byCategoryId.__uncategorized ?? []).filter(matches);
  if (loose.length > 0) {
    const open = pushFolder(
      UNCATEGORIZED_ID,
      "Uncategorized",
      0,
      null,
      loose.length,
    );
    if (open) {
      for (const def of loose) {
        rows.push(blockRow(def, 1, UNCATEGORIZED_ID, selectedItemId, wide));
      }
    }
  }
  return rows;
}

