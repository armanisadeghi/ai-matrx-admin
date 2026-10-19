"use client";

// features/launchpad/widgets/bodies/AppPageWidget.tsx — ANY page of the app inside a widget (a Space page, a
// list, a dashboard). Adapted, not copied: the body IS the Board's "Page" item (board/items/page-items.tsx),
// which frames the app itself at that address without the shell. Interactive in view mode; quiet in Edit.
import { PAGE_ITEMS, pageSource, pageTitleFor } from "@/features/board/items/page-items";
import { configText, type LaunchpadWidgetBodyProps } from "../types";
import { WidgetNotice } from "../frame";

const PageItem = PAGE_ITEMS[0]!;

export function AppPageWidget({ config, editing }: LaunchpadWidgetBodyProps) {
  const path = configText(config, "path");
  if (!path) return <WidgetNotice>{editing ? "Set up to choose a page" : "No page chosen"}</WidgetNotice>;
  const Body = PageItem.Body;
  return (
    <Body
      tileId={`launchpad:${path}`}
      source={pageSource(path)}
      title={pageTitleFor(path)}
      tier="read"
      interacting={!editing}
      onSource={() => undefined}
    />
  );
}
