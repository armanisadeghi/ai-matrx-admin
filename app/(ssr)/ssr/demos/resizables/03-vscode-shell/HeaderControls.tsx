"use client";

import {
  PanelLeftTapButton,
  TerminalTapButton,
  MessageTapButton,
  HistoryTapButton,
} from "@/components/icons/tap-buttons";
import { usePanelControls } from "../_lib/PanelControlProvider";
import { DemoTitle } from "../_lib/DemoTitle";
import { BackChevron } from "../_lib/BackChevron";

export function VSCodeHeaderControls() {
  const { toggle, isCollapsed } = usePanelControls();
  const sidebarCollapsed = isCollapsed("sidebar");
  const terminalCollapsed = isCollapsed("terminal");
  const chatCollapsed = isCollapsed("chat");
  const historyCollapsed = isCollapsed("chat-history");

  return (
    <div className="flex items-center justify-between w-full gap-2 min-w-0">
      <div className="flex items-center gap-1">
        <BackChevron href="/ssr/demos/resizables" />
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
        subtitle="VSCode-style · 3 nested groups · 4 collapsibles"
      />
      <div className="flex items-center gap-1">
        <MessageTapButton
          onClick={() => toggle("chat")}
          ariaLabel={chatCollapsed ? "Show chat" : "Hide chat"}
          tooltip={chatCollapsed ? "Show chat" : "Hide chat"}
        />
        <HistoryTapButton
          onClick={() => toggle("chat-history")}
          ariaLabel={historyCollapsed ? "Show chat history" : "Hide chat history"}
          tooltip={historyCollapsed ? "Show chat history" : "Hide chat history"}
        />
      </div>
    </div>
  );
}
