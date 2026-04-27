"use client";

import {
  PanelLeftTapButton,
  PanelRightTapButton,
} from "@/components/icons/tap-buttons";
import { usePanelControls } from "../_lib/PanelControlProvider";
import { DemoTitle } from "../_lib/DemoTitle";

export function WorkbenchHeaderControls() {
  const { toggle, isCollapsed } = usePanelControls();
  const filesCollapsed = isCollapsed("files");
  const inspectorCollapsed = isCollapsed("inspector");

  return (
    <div className="flex items-center justify-between w-full gap-2 min-w-0">
      <PanelLeftTapButton
        onClick={() => toggle("files")}
        ariaLabel={filesCollapsed ? "Show files" : "Hide files"}
        tooltip={filesCollapsed ? "Show files" : "Hide files"}
      />
      <DemoTitle
        title="Demo 02 — Workbench"
        subtitle="3 panels · 2 collapsibles · cookie SSR"
      />
      <PanelRightTapButton
        onClick={() => toggle("inspector")}
        ariaLabel={inspectorCollapsed ? "Show inspector" : "Hide inspector"}
        tooltip={inspectorCollapsed ? "Show inspector" : "Hide inspector"}
      />
    </div>
  );
}
