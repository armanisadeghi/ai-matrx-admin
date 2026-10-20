"use client";

// features/launchpad/widgets/bodies/AppPageWidget.tsx — ANY page of the app inside a widget (a Space page, a
// list, a dashboard). Adapted, not copied: the body IS the Board's "Page" item (board/items/page-items.tsx),
// which frames the app itself at that address without the shell. Interactive in view mode; quiet in Edit.
//
// Page bus: a connected "Record to open" wins over the saved address — the widget shows the record another
// widget on the page picked (its own page, from the entity registry), and the saved address while none is.
import { PAGE_ITEMS, pageSource, pageTitleFor } from "@/features/board/items/page-items";
import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { configText, type LaunchpadWidgetBodyProps } from "../types";
import { WidgetNotice } from "../frame";
import { usePageInput, usePageInputConnected } from "../../bus/react";
import type { PageRecordValue } from "../../bus/ports";

const PageItem = PAGE_ITEMS[0]!;

/** Where a picked record opens: its own address, else the entity registry's page for it. */
export function recordPagePath(record: PageRecordValue | undefined): string | null {
  if (!record) return null;
  return record.href ?? tryGetEntityInfo(record.token)?.hrefFor?.(record.id) ?? null;
}

export function AppPageWidget({ config, editing }: LaunchpadWidgetBodyProps) {
  const connected = usePageInputConnected("record");
  const picked = usePageInput("record", "record");
  const path = recordPagePath(picked) ?? configText(config, "path");
  if (!path) {
    return (
      <WidgetNotice>
        {connected ? "Pick a record in the connected widget" : editing ? "Set up to choose a page" : "No page chosen"}
      </WidgetNotice>
    );
  }
  const Body = PageItem.Body;
  return (
    <Body
      key={path}
      tileId={`launchpad:${path}`}
      source={pageSource(path)}
      title={picked?.label ?? pageTitleFor(path)}
      tier="read"
      interacting={!editing}
      onSource={() => undefined}
    />
  );
}
