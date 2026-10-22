"use client";

// features/launchpad/widgets/bodies/BoardItemWidget.tsx — ANY BOARD ITEM ON A LAUNCHPAD (lane U: one widget registry).
// A Board item type registers once (`features/board/items/catalog.ts`) and is placeable here as a launchpad widget:
// the body is that type's own `Body` — the feature's canonical component (the real note editor, task, chat…) —
// mounted for the saved record. Nothing is copied: the config is the reference `{ itemType, id }` a board tile holds.
//
// The board catalog (40 types, each with its feature's body) is loaded only when a launchpad holds a Board item.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@ai-matrx/design-system/controls";
import type { BoardItemType } from "@/features/board/items/types";
import type { NodeSource } from "@/features/board/board/document";
import { configText, type LaunchpadWidgetBodyProps } from "../types";

type Lookup = (key: string) => BoardItemType | null;
let catalog: Promise<{ find: Lookup; types: readonly BoardItemType[] }> | null = null;
/** The board's item catalog, loaded once (the launchpad's Set up panel lists it too). */
export function loadBoardItemCatalog(): Promise<{ find: Lookup; types: readonly BoardItemType[] }> {
  catalog ??= import("@/features/board/items/catalog").then((m) => ({ find: m.itemTypeByKey, types: m.BOARD_ITEM_TYPES }));
  return catalog;
}

/** The board tile source a Board item widget's config names (an entity reference; null when none is chosen). */
export function boardItemSource(config: Readonly<Record<string, unknown>>): NodeSource | null {
  const entity = configText(config, "itemType");
  const id = configText(config, "id");
  return entity && id ? { kind: "entity", entity, id } : null;
}

export function BoardItemWidget({ config, editing }: LaunchpadWidgetBodyProps) {
  const [lookup, setLookup] = useState<{ find: Lookup } | { error: string } | null>(null);
  useEffect(() => {
    let live = true;
    loadBoardItemCatalog().then(
      ({ find }) => live && setLookup({ find }),
      (e: unknown) => live && setLookup({ error: e instanceof Error ? e.message : "The board items could not load." }),
    );
    return () => {
      live = false;
    };
  }, []);
  const source = boardItemSource(config);
  if (!source) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
        <p className="text-xs text-muted-foreground">No item chosen</p>
        <Button variant="outline" asChild>
          <Link href="/board">Your boards</Link>
        </Button>
      </div>
    );
  }
  if (lookup === null) return <div className="h-full animate-pulse rounded bg-muted" aria-busy />;
  if ("error" in lookup) return <p className="px-2 text-xs text-destructive">{lookup.error}</p>;
  const type = lookup.find(configText(config, "itemType"));
  if (!type) return <p className="px-2 text-xs text-muted-foreground">{`Unavailable item "${configText(config, "itemType")}"`}</p>;
  const { Body } = type;
  return (
    <div className="h-full min-h-0 overflow-auto" data-launchpad-board-item={type.key}>
      <Body
        tileId={`launchpad:${type.key}:${configText(config, "id")}`}
        source={source}
        title={configText(config, "title") || type.label}
        tier="read"
        interacting={!editing}
        // The widget's reference is its saved config; a body re-pointing itself (a draft gaining an id) never
        // happens here — a launchpad only places records that already exist.
        onSource={() => undefined}
      />
    </div>
  );
}
