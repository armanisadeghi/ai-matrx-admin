"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Panel, useGroupRef, type Layout } from "react-resizable-panels";
import { ClientGroup } from "@/features/resizable-panels/ClientGroup";
import { Handle } from "@/features/resizable-panels/Handle";
import {
  STUDIO_PANES_GROUP_ID,
  studioPaneMinPx,
  studioPaneShown,
  studioPanesCookie,
  studioPanesLayout,
  type StudioLayout,
  type StudioPane,
  type StudioPaneUi,
  type StudioSavedSizes,
} from "../studio-layout";

/**
 * The Studio's panes: ONE resizable group whose three panels never unmount. A layout change only sets the
 * sizes (hidden panes collapse to 0) and re-styles; the person drags the handles between shown panes, and
 * each layout's sizes are kept in its own cookie (read on the server, so a reload paints them first).
 */
export function StudioPanes({
  layout,
  ui,
  saved,
  switchBar,
  panes,
}: {
  layout: StudioLayout;
  ui: StudioPaneUi;
  /** The sizes the server read from the cookies. */
  saved: StudioSavedSizes;
  switchBar: ReactNode;
  panes: Record<StudioPane, ReactNode>;
}) {
  const groupRef = useGroupRef();
  const remembered = useRef<StudioSavedSizes>(saved);
  const target = studioPanesLayout(layout, ui, remembered.current);
  const targetKey = JSON.stringify(target);
  const firstLayout = useRef(target);

  useEffect(() => {
    const current = groupRef.current?.getLayout();
    if (current && JSON.stringify(current) !== targetKey) groupRef.current?.setLayout(JSON.parse(targetKey) as Layout);
  }, [groupRef, targetKey]);

  const shown = (pane: StudioPane | "switch") => studioPaneShown(layout, pane, ui);
  const slot = (pane: StudioPane) => ({
    hidden: !shown(pane),
    "data-studio-pane": pane,
    "data-testid": `studio-pane-${pane}`,
    "data-assist-dock-avoid": true,
    className: "h-full min-h-0 min-w-0 overflow-hidden",
  });
  const panel = (pane: StudioPane) => (
    <Panel
      id={pane}
      minSize={`${studioPaneMinPx(layout, pane)}px`}
      collapsible={!shown(pane)}
      collapsedSize="0%"
      className="min-w-0"
    >
      <div {...slot(pane)}>{panes[pane]}</div>
    </Panel>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="studio-panes">
      <div hidden={!shown("switch")} data-studio-pane="switch" className="shrink-0">
        {switchBar}
      </div>
      <ClientGroup
        id={STUDIO_PANES_GROUP_ID}
        cookieName={studioPanesCookie(layout)}
        groupRef={groupRef}
        defaultLayout={firstLayout.current}
        orientation="horizontal"
        className="min-h-0 flex-1"
        onLayoutChanged={(next) => {
          if (layout === "three" || layout === "two") remembered.current = { ...remembered.current, [layout]: next };
        }}
      >
        {panel("assistant")}
        {shown("assistant") && shown("agent") ? <Handle id="studio-resize-assistant-agent" /> : null}
        {panel("agent")}
        {shown("agent") && shown("controls") ? <Handle id="studio-resize-agent-controls" /> : null}
        {panel("controls")}
      </ClientGroup>
    </div>
  );
}
