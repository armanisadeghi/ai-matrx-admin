import { Group, Panel, Separator } from "react-resizable-panels";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/ssr/demos/resizables/00-baseline", {
  title: "00 · Baseline 2-panel split",
  description: "Smallest possible v4 example. Server component, no persistence, no callbacks.",
});

// SERVER COMPONENT. No 'use client' directive.
//
// Group / Panel / Separator each carry their own 'use client' inside the library,
// so we can render them directly from a Server Component as long as we don't
// pass any function props (those can't cross the RSC boundary). For persistence
// (cookie writes via onLayoutChanged) we wrap Group in a 'use client' component
// — see demo 01-cookie-ssr.
export default function ResizableBaselineDemo() {
  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-textured">
      <header className="border-b border-border bg-card px-4 py-2">
        <h1 className="text-sm font-medium">Demo 00 — baseline 2-panel split</h1>
        <p className="text-xs text-muted-foreground">
          No persistence. Reload returns panels to their default 50/50 split.
        </p>
      </header>

      <div className="flex-1 overflow-hidden">
        <Group
          id="demo-baseline"
          orientation="horizontal"
          className="h-full w-full"
        >
          <Panel id="left" defaultSize="50%" minSize="20%">
            <div className="h-full p-4 bg-muted">
              <h2 className="text-sm font-medium mb-2">Left panel</h2>
              <p className="text-xs text-muted-foreground">
                Drag the separator to resize.
              </p>
            </div>
          </Panel>

          <Separator className="w-0.5 bg-border data-[separator=hover]:bg-primary data-[separator=dragging]:bg-primary transition-colors cursor-col-resize" />

          <Panel id="right" defaultSize="50%" minSize="20%">
            <div className="h-full p-4 bg-card">
              <h2 className="text-sm font-medium mb-2">Right panel</h2>
              <p className="text-xs text-muted-foreground">
                Both panels have <code className="text-foreground">minSize=&quot;20%&quot;</code>.
              </p>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
