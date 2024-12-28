"use client";

import React, { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import { PanelLeft, PanelRight } from "lucide-react";
import { PanelManager } from "./PanelManager";

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

  return (
    <div className="flex flex-col h-full p-0 space-y-0 bg-background">
      <Card className="p-2 bg-background flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isLeftCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={openLeftPanel}
              title="Open Left Panel"
            >
              <PanelLeft className="h-3 w-3" />
            </Button>
          )}
          <div>Header Content</div>
        </div>
        {isRightCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={openRightPanel}
            title="Open Right Panel"
          >
            <PanelRight className="h-3 w-3" />
          </Button>
        )}
      </Card>

      <PanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar */}
        <Panel
          defaultSize={12}
          minSize={5}
          maxSize={40}
          collapsible
          ref={leftPanelRef}
          onCollapse={onLeftPanelChange}
          onExpand={onLeftPanelChange}
        >
          <Card className="h-full p-2 overflow-y-auto bg-background">
            <div className="font-semibold m-2">Left Sidebar</div>
          </Card>
        </Panel>

        <PanelResizeHandle />

        <PanelManager side="left" />

        <PanelResizeHandle />

        <PanelManager side="right" />

        <PanelResizeHandle />

        {/* Right Sidebar */}
        <Panel
          defaultSize={12}
          minSize={5}
          maxSize={40}
          collapsible
          ref={rightPanelRef}
          onCollapse={onRightPanelChange}
          onExpand={onRightPanelChange}
        >
          <Card className="h-full p-2 overflow-y-auto bg-background">
            <div className="font-semibold m-2">Right Sidebar</div>
          </Card>
        </Panel>
      </PanelGroup>
    </div>
  );
}
