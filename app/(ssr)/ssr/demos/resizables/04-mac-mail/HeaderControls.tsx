"use client";

import {
  PanelLeftTapButton,
  PanelRightTapButton,
  MenuTapButton,
  HistoryTapButton,
} from "@/components/icons/tap-buttons";
import { usePanelControls } from "../_lib/PanelControlProvider";
import { DemoTitle } from "../_lib/DemoTitle";
import { BackChevron } from "../_lib/BackChevron";

export function MailHeaderControls() {
  const { toggle, isCollapsed } = usePanelControls();
  const foldersCollapsed = isCollapsed("folders");
  const messagesCollapsed = isCollapsed("messages");
  const inspectorCollapsed = isCollapsed("inspector");
  const historyCollapsed = isCollapsed("chat-history");

  return (
    <div className="flex items-center justify-between w-full gap-2 min-w-0">
      <div className="flex items-center gap-1">
        <BackChevron href="/ssr/demos/resizables" />
        <PanelLeftTapButton
          onClick={() => toggle("folders")}
          ariaLabel={foldersCollapsed ? "Show folders" : "Hide folders"}
          tooltip={foldersCollapsed ? "Show folders" : "Hide folders"}
        />
        <MenuTapButton
          onClick={() => toggle("messages")}
          ariaLabel={messagesCollapsed ? "Show messages list" : "Hide messages list"}
          tooltip={messagesCollapsed ? "Show messages list" : "Hide messages list"}
        />
      </div>
      <DemoTitle
        title="Demo 04 — Mail"
        subtitle="multi-sidebar · 4 independent collapsibles"
      />
      <div className="flex items-center gap-1">
        <PanelRightTapButton
          onClick={() => toggle("inspector")}
          ariaLabel={inspectorCollapsed ? "Show inspector" : "Hide inspector"}
          tooltip={inspectorCollapsed ? "Show inspector" : "Hide inspector"}
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
