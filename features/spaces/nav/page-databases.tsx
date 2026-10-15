// features/spaces/nav/page-databases.tsx — the databases on a Spaces page and their views, as the tiered
// breadcrumb's second and third tiers (a database opens at its block; a view at its block with that view).

import type { TieredItem } from "@/components/official/tiered-breadcrumb/model";

import type { SpaceBlock } from "../contract";
import { readDatabaseProps } from "../data/sources";
import { viewIcon } from "../data/view-icons";

export const spaceHref = (id: string) => `/spaces/${id}`;

/** Every database block on a page (nested ones too — columns, toggles, tabs), with its views. */
export function databasesOfPage(pageId: string, blocks: readonly SpaceBlock[]): TieredItem[] {
  const out: TieredItem[] = [];
  const walk = (list: readonly SpaceBlock[]) => {
    for (const block of list) {
      if (block.type === "database") {
        const props = readDatabaseProps((block.props ?? {}) as Record<string, unknown>);
        if (props) {
          const base = `${spaceHref(pageId)}`;
          const views = props.views?.length ? props.views : [{ id: "view-all", name: "All", layout: "grid" as const }];
          out.push({
            id: `${pageId}:${block.id}`,
            label: props.title?.trim() || "Database",
            href: `${base}#block-${block.id}`,
            children: views.map((view) => ({
              id: `${pageId}:${block.id}:${view.id}`,
              label: view.name?.trim() || "Untitled view",
              icon: viewIcon(view, 15),
              href: `${base}?view=${encodeURIComponent(view.id)}#block-${block.id}`,
              expandable: false,
            })),
          });
        }
      }
      if (block.children?.length) walk(block.children);
    }
  };
  walk(blocks);
  return out;
}

