"use client";

// features/launchpad/widgets/bodies/AppletWidget.tsx — one Applet, live, inside a launchpad widget: the SAME
// `AppletInPage` a Space page's applet block and records-ui pages draw (through its one lazy door in
// appletsPort), so an Applet here is the real Applet with its own pages and writes.
import Link from "next/link";
import { Button } from "@ai-matrx/design-system/controls";
import { AppletInPageLazy } from "@/features/applets/embed/appletsPort";
import { configText, type LaunchpadWidgetBodyProps } from "../types";
import { WidgetNotice } from "../frame";
import { useAppletPageValues } from "../../bus/react";

export function AppletWidget({ config, editing }: LaunchpadWidgetBodyProps) {
  const appId = configText(config, "appId");
  // Page bus: connected inputs reach the Applet as `useValue("in_record" | "in_file" | "in_text")`; what it
  // sets with `useValue("out_record" | "out_text" | "out_shape")` reaches the widgets connected to this one.
  const pageValues = useAppletPageValues();
  if (!appId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
        <WidgetNotice>{editing ? "Set up to choose an Applet" : "No Applet chosen"}</WidgetNotice>
        {editing ? null : (
          <Button variant="outline" asChild>
            <Link href="/applets">Your Applets</Link>
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto">
      <AppletInPageLazy appId={appId} pageValues={pageValues} />
    </div>
  );
}
