"use client";

import {
  PanelLeftTapButton,
  TerminalTapButton,
  MessageTapButton,
} from "@/components/icons/tap-buttons";
import { usePanelControls } from "../_lib/PanelControlProvider";
import { DemoTitle } from "../_lib/DemoTitle";

export function VSCodeHeaderControls() {
  const { toggle, isCollapsed } = usePanelControls();
  const sidebarCollapsed = isCollapsed("sidebar");
  const terminalCollapsed = isCollapsed("terminal");
  const chatCollapsed = isCollapsed("chat");

  return (
    <div className="flex items-center justify-between w-full gap-2 min-w-0">
      <div className="flex items-center gap-1">
        <PanelLeftTapButton
          onClick={() => toggle("sidebar")}
          ariaLabel={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          tooltip={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        />
        <TerminalTapButton
          onClick={() => toggle("terminal")}
          ariaLabel={terminalCollapsed ? "Show terminal" : "Hide terminal"}
          tooltip={terminalCollapsed ? "Show terminal" : "Hide terminal"}
        />
      </div>
      <DemoTitle
        title="Demo 03 — Workspace"
        subtitle="VSCode-style nested groups · 2 cookies · 3 collapsibles"
      />
      <MessageTapButton
        onClick={() => toggle("chat")}
        ariaLabel={chatCollapsed ? "Show chat" : "Hide chat"}
        tooltip={chatCollapsed ? "Show chat" : "Hide chat"}
      />
    </div>
  );
}
