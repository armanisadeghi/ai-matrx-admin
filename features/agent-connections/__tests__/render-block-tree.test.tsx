// Arman, 2026-10-07: trees indent properly (one level = one step, children exactly one
// level deeper), folders and files look different, folders sit above files (Finder).
// These pin WHICH rows exist and at what depth; TopicTree turns depth into 16px steps.
import { isValidElement, type ReactElement } from "react";

import { TreeFolderIcon } from "@/components/official/topic-tree/geometry";
import type { CategoryTreeNode } from "../redux/skl/selectors";
import type { SklRenderDefinition } from "../redux/skl/types";
import {
  FOLDER_PREFIX,
  UNCATEGORIZED_ID,
  flattenTree,
} from "../components/sections/renderBlockTree";

const cat = (id: string, label: string, children: CategoryTreeNode[] = []) =>
  ({ category: { id, label }, children }) as unknown as CategoryTreeNode;

const block = (id: string, label: string, blockType: SklRenderDefinition["blockType"] = "markdown") =>
  ({
    id,
    label,
    blockId: label.toLowerCase().replace(/\s+/g, "-"),
    description: `${label} description`,
    blockType,
    isActive: true,
    isPublic: true,
  }) as unknown as SklRenderDefinition;

// AI Prompts ▸ (Timeline ▸ [Simple Timeline]) + [User Decision]; Structure ▸ [Heading 1]; one loose block.
const tree = [cat("ai", "AI Prompts", [cat("tl", "Timeline")]), cat("st", "Structure")];
const byCategoryId: Record<string, SklRenderDefinition[]> = {
  ai: [block("b-decision", "User Decision", "xml")],
  tl: [block("b-timeline", "Simple Timeline")],
  st: [block("b-h1", "Heading 1")],
  __uncategorized: [block("b-loose", "Loose Block", "render_kind")],
};

const all = () => true;
const rows = (opts: Partial<Parameters<typeof flattenTree>[0]> = {}) =>
  flattenTree({
    categoryTree: tree,
    byCategoryId,
    matches: all,
    isExpanded: () => true,
    selectedItemId: null,
    wide: true,
    ...opts,
  });

it("children sit exactly one level below their folder, and folders come before blocks", () => {
  expect(rows().map((r) => [r.label, r.depth, r.hasChildren])).toEqual([
    ["AI Prompts", 0, true],
    ["Timeline", 1, true],
    ["Simple Timeline", 2, false],
    ["User Decision", 1, false],
    ["Structure", 0, true],
    ["Heading 1", 1, false],
    ["Uncategorized", 0, true],
    ["Loose Block", 1, false],
  ]);
});

it("every child names its parent folder, so the tree's structure matches its indentation", () => {
  const byId = new Map(rows().map((r) => [r.id, r]));
  for (const r of rows()) {
    if (r.parentId === null) {
      expect(r.depth).toBe(0);
    } else {
      expect(byId.get(r.parentId)?.depth).toBe(r.depth - 1);
    }
  }
});

it("folders show the Finder folder and blocks never do", () => {
  for (const r of rows()) {
    const icon = r.icon as ReactElement;
    expect(isValidElement(icon)).toBe(true);
    expect(icon.type === TreeFolderIcon).toBe(r.hasChildren);
  }
  expect(rows().filter((r) => r.hasChildren).every((r) => r.id.startsWith(FOLDER_PREFIX))).toBe(true);
});

it("a closed folder hides everything under it but still counts it", () => {
  const closed = rows({ isExpanded: (id) => id !== `${FOLDER_PREFIX}ai` });
  expect(closed.map((r) => r.label)).toEqual([
    "AI Prompts",
    "Structure",
    "Heading 1",
    "Uncategorized",
    "Loose Block",
  ]);
  expect(closed.find((r) => r.id === UNCATEGORIZED_ID)?.expanded).toBe(true);
});

it("search keeps only folders that hold a match", () => {
  const found = rows({ matches: (d) => d.label.includes("Timeline") });
  expect(found.map((r) => r.label)).toEqual(["AI Prompts", "Timeline", "Simple Timeline"]);
});

it("the open block is the selected row", () => {
  const selected = rows({ selectedItemId: "b-h1" }).filter((r) => r.selected);
  expect(selected.map((r) => r.label)).toEqual(["Heading 1"]);
});
