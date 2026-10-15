"use client";

// features/spaces/nav/tiered-crumbs.tsx — a Spaces page's breadcrumb, through the one tiered breadcrumb
// (components/official/tiered-breadcrumb). Tier 1 = the pages beside a segment (already in the sidebar's
// tree, no read); tier 2 = the databases on a hovered page (one read of that page, when first hovered);
// tier 3 = each database's views (they ride in the same read). A database opens at its block; a view
// opens at its block with that view showing (data/url-view.ts).

import { TieredBreadcrumb } from "@/components/official/tiered-breadcrumb/TieredBreadcrumb";
import type { TieredItem, TieredSegment } from "@/components/official/tiered-breadcrumb/model";

import type { SpaceSummary } from "../contract";
import { databasesOfPage, spaceHref } from "./page-databases";
import { SpaceIcon } from "../page/SpaceIcon";
import { useSpaces } from "../state/SpacesProvider";

const pageItem = (page: SpaceSummary, currentId: string): TieredItem => ({
  id: page.id,
  label: page.title || "Untitled",
  icon: page.icon ? <SpaceIcon media={page.icon} size={16} /> : undefined,
  href: spaceHref(page.id),
  current: page.id === currentId,
});

export function SpacesTieredBreadcrumb({ path, className }: { path: readonly SpaceSummary[]; className?: string }) {
  const { store, childrenOf, byId } = useSpaces();
  const segments: TieredSegment[] = path.map((page) => ({
    id: page.id,
    label: page.title || "Untitled",
    icon: page.icon ? <SpaceIcon media={page.icon} size={16} /> : undefined,
    href: spaceHref(page.id),
    siblings: async () => {
      const parent = page.parentId ? byId.get(page.parentId) : undefined;
      return {
        heading: `Other pages in ${parent ? parent.title || "Untitled" : "Spaces"}`,
        items: childrenOf(page.parentId ?? null).map((p) => pageItem(p, page.id)),
      };
    },
  }));
  return (
    <TieredBreadcrumb
      className={className}
      segments={segments}
      segmentClassName="spaces-breadcrumb-item"
      separatorClassName="spaces-breadcrumb-sep"
      loadChildren={async (item) => {
        const doc = await store.get(item.id);
        return doc ? databasesOfPage(doc.id, doc.blocks) : [];
      }}
    />
  );
}
