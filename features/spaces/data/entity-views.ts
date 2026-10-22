// features/spaces/data/entity-views.ts — what a database block over a built-in source (data/EntityDatabase.tsx)
// offers beside a custom table's (CD-VIEW-11): its layouts, how many rows a view reads, which properties a card
// shows, and which settings each layout takes. Pure; tested in
// __tests__/a-built-in-source-offers-gallery-list-card-size-and-load-limit.test.ts.
import type { EntityColumn } from "@ai-matrx/records-ui";

import { ENTITY_PAGE } from "./first-reads";
import type { SpaceDbView, SpaceViewLayout } from "./sources";
import { blockPageSize, DEFAULT_CARD_FIELDS } from "./view-spec";

/** The layouts a built-in source draws, in the layout menu's order. */
export const ENTITY_LAYOUT_IDS: readonly SpaceViewLayout[] = ["grid", "kanban", "gallery", "list", "chart"];

/** Rows a built-in view reads at first and per "Load more": its own load limit, else the block's page. */
export function entityPageSize(view: Pick<SpaceDbView, "loadLimit">): number {
  return blockPageSize(view) ?? ENTITY_PAGE;
}

const isBareId = (c: EntityColumn) => /uuid/i.test(c.type) || (c.api_name.endsWith("_id") && !c.lookup);

/** The properties a gallery card or list row shows under its title: the view's shown ones, never a bare id. */
export function entityCardColumns(columns: readonly EntityColumn[], hidden: readonly string[], title: EntityColumn | undefined): EntityColumn[] {
  const off = new Set(hidden);
  return columns.filter((c) => c !== title && !off.has(c.api_name) && !isBareId(c)).slice(0, DEFAULT_CARD_FIELDS);
}

/** Which of the card-size and load-limit settings a layout takes. */
export function entitySettingsFor(layout: SpaceViewLayout): { cardSize: boolean; loadLimit: boolean } {
  return { cardSize: layout === "gallery", loadLimit: layout !== "chart" };
}
