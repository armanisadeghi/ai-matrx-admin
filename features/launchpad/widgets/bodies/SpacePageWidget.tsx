"use client";

// features/launchpad/widgets/bodies/SpacePageWidget.tsx — a Space page on a launchpad: a Notion-like text area
// written in place. The body is the Spaces feature's own door (`SpaceWidgetBody`: the same editor and autosave
// a row's body page uses). While the launchpad is in Edit mode the page is read-only, so arranging widgets
// never types into it.
import { SpaceWidgetBody } from "@/features/spaces/embed/SpaceWidget";
import { WidgetNotice } from "../frame";
import { configText, type LaunchpadWidgetBodyProps } from "../types";

export function SpacePageWidget({ config, editing }: LaunchpadWidgetBodyProps) {
  const spaceId = configText(config, "spaceId");
  if (!spaceId) return <WidgetNotice>{editing ? "Set up to choose a page" : "No page chosen"}</WidgetNotice>;
  return (
    <div className="h-full overflow-y-auto" data-no-drag>
      <SpaceWidgetBody spaceId={spaceId} readOnly={editing} />
    </div>
  );
}
