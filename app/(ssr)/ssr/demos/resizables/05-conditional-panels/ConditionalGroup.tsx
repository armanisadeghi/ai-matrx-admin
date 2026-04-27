"use client";

import { useMemo } from "react";
import {
  Group,
  Panel,
  useDefaultLayout,
  type LayoutStorage,
} from "react-resizable-panels";
import { Info } from "lucide-react";
import { Handle } from "../_lib/Handle";
import { useMountState } from "./MountStateProvider";

// Cookie-backed LayoutStorage adapter — useDefaultLayout reads/writes through
// this so persistence round-trips through cookies (server-readable).
const cookieStorage: LayoutStorage = {
  getItem(key) {
    if (typeof document === "undefined") return null;
    const row = document.cookie
      .split("; ")
      .find((r) => r.startsWith(`${encodeURIComponent(key)}=`));
    return row ? decodeURIComponent(row.split("=")[1]) : null;
  },
  setItem(key, value) {
    if (typeof document === "undefined") return;
    document.cookie =
      `${encodeURIComponent(key)}=${encodeURIComponent(value)}` +
      `; path=/; max-age=31536000; SameSite=Lax`;
  },
};

// Client component because useDefaultLayout is a hook and Group needs the
// onLayoutChanged callback prop. Reads showRight from MountStateProvider via
// context (works through the PageHeader portal boundary because portals
// preserve React context).
export function ConditionalGroup() {
  const { showRight } = useMountState();

  // panelIds reflects which panels are CURRENTLY MOUNTED. The lib builds a
  // different storage key per permutation, so each combination remembers its
  // own layout independently.
  const panelIds = useMemo(
    () => ["left", "center", ...(showRight ? ["right"] : [])],
    [showRight],
  );

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "demo-05",
    panelIds,
    storage: cookieStorage,
  });

  const storageKey = `react-resizable-panels:${["demo-05", ...panelIds].join(":")}`;

  return (
    <Group
      id="demo-05"
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      className="h-full w-full"
    >
      <Panel id="left" defaultSize="20%" minSize="5%">
        <div className="h-full overflow-auto p-4 bg-muted">
          <h2 className="text-sm font-medium mb-1">Left</h2>
          <p className="text-xs text-muted-foreground">
            <code className="text-foreground">defaultSize=&quot;20%&quot;</code> · always mounted
          </p>
        </div>
      </Panel>
      <Handle />
      <Panel id="center" minSize="30%">
        <div className="h-full overflow-auto p-4 bg-card space-y-3">
          <h2 className="text-sm font-medium">Center</h2>
          <p className="text-xs text-muted-foreground">
            Currently mounted panels:{" "}
            <code className="text-foreground">{panelIds.join(", ")}</code>
          </p>
          <div className="rounded border border-border bg-muted/50 p-3 flex gap-2 text-xs">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-foreground/85 leading-relaxed">
              <p className="mb-1">
                Each permutation of mounted panels is stored under its own cookie:
              </p>
              <code className="text-foreground font-mono break-all">{storageKey}</code>
              <p className="mt-2">
                Resize, then toggle the right panel. Resize again. Toggle back.
                Each combination is remembered independently.
              </p>
            </div>
          </div>
        </div>
      </Panel>
      {showRight && (
        <>
          <Handle />
          <Panel id="right" defaultSize="22%" minSize="5%">
            <div className="h-full overflow-auto p-4 bg-muted">
              <h2 className="text-sm font-medium mb-1">Right</h2>
              <p className="text-xs text-muted-foreground">
                Mounted/unmounted via toggle. Not just collapsed.
              </p>
            </div>
          </Panel>
        </>
      )}
    </Group>
  );
}
