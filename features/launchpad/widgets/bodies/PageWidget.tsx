"use client";

// features/launchpad/widgets/bodies/PageWidget.tsx — one of the person's own data pages (`DataPage`). The
// start page of before (one chosen page) is this widget now; nothing was lost.
import Link from "next/link";
import { DataPage } from "@/features/applets/embed/DataPage";
import { configText, type LaunchpadWidgetBodyProps } from "../types";
import { Button } from "@ai-matrx/design-system/controls";

export function PageWidget({ config }: LaunchpadWidgetBodyProps) {
  if (!configText(config, "pageId")) {
    // An ordinary-height slot (frame.slotHeightPx), honest about what is missing, with the way to fix it.
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
        <p className="text-xs text-muted-foreground">No data page chosen</p>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/data/pages">Your pages</Link>
          </Button>
          <Button variant="primary" asChild>
            <Link href="/make">Make a page</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto px-2">
      <DataPage id={configText(config, "pageId")} />
    </div>
  );
}
