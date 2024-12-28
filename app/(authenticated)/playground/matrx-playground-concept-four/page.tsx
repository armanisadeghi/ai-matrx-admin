"use client";

import React, { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import { PanelManager } from "./components/content/PanelManager";
import ModelSettingsPanel from "./components/settings/ModelSettingsPanel";
import BrokerSidebar from "./components/brokers/BrokersSidebar";
import PlaygroundHeader from "./components/PlaygroundHeader";
import { useMeasure } from "@uidotdev/usehooks";

export default function DynamicPanelsPage() {
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // Panel handlers for sidebars
  const onLeftPanelChange = () => {
    if (leftPanelRef.current) {
      setIsLeftCollapsed(leftPanelRef.current.isCollapsed());
    }
  };

  const onRightPanelChange = () => {
    if (rightPanelRef.current) {
      setIsRightCollapsed(rightPanelRef.current.isCollapsed());
    }
  };

  const openLeftPanel = () => {
    leftPanelRef.current?.resize(12);
  };

  const openRightPanel = () => {
    rightPanelRef.current?.resize(12);
  };

  // Placeholder props for PlaygroundHeader
  const placeholderProps = {
    onToggleBrokers: () =>
      leftPanelRef.current?.resize(isLeftCollapsed ? 12 : 0),
    onToggleSettings: () =>
      rightPanelRef.current?.resize(isRightCollapsed ? 12 : 0),
    onShowCode: () => console.log("Show code clicked"),
    currentMode: "default",
    onModeChange: (mode: string) => console.log(`Mode changed to: ${mode}`),
    version: 1,
    onVersionChange: (version: number) =>
      console.log(`Version changed to: ${version}`),
    onPlay: () => console.log("Play clicked"),
    isLeftCollapsed,
    isRightCollapsed,
    openLeftPanel,
    openRightPanel,
  };
  const [ref, { width, height }] = useMeasure();

  return (
    <div className="flex flex-col h-full p-0 space-y-0 bg-background">
      <PlaygroundHeader {...placeholderProps} />

      <PanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar */}
        <Panel
          defaultSize={15}
          minSize={8}
          maxSize={40}
          collapsible
          ref={leftPanelRef}
          onCollapse={onLeftPanelChange}
          onExpand={onLeftPanelChange}
        >
          <Card className="h-full p-2 overflow-y-auto bg-background">
            <BrokerSidebar />
          </Card>
        </Panel>

        <PanelResizeHandle />

        <PanelManager side="left" />

        <PanelResizeHandle />

        <PanelManager side="right" />

        <PanelResizeHandle />

        {/* Right Sidebar */}
        <Panel
          defaultSize={15}
          minSize={8}
          maxSize={40}
          collapsible
          ref={rightPanelRef}
          onCollapse={onRightPanelChange}
          onExpand={onRightPanelChange}
        >
          <Card className="h-full p-2 overflow-y-auto bg-background">
            <ModelSettingsPanel />
          </Card>
        </Panel>
      </PanelGroup>
    </div>
  );
}
