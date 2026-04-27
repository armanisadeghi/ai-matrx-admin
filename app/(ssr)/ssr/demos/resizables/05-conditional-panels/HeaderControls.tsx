"use client";

import { PanelRightTapButton } from "@/components/icons/tap-buttons";
import { useMountState } from "./MountStateProvider";
import { DemoTitle } from "../_lib/DemoTitle";

export function ConditionalHeaderControls() {
  const { showRight, toggleRight } = useMountState();
  return (
    <div className="flex items-center justify-between w-full gap-2 min-w-0">
      <div className="w-11" />
      <DemoTitle
        title="Demo 05 — Conditional panels"
        subtitle={`right panel: ${showRight ? "mounted" : "unmounted"} · per-combo memory`}
      />
      <PanelRightTapButton
        onClick={toggleRight}
        ariaLabel={showRight ? "Unmount right panel" : "Mount right panel"}
        tooltip={showRight ? "Unmount right panel" : "Mount right panel"}
      />
    </div>
  );
}
