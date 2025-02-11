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
import { PanelLeft, PanelRight, Plus } from "lucide-react";
import { VerticalPanel } from "./VerticalPanelTwo";

type CenterPanelSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export default function DynamicPanelsPage() {
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [collapsedPanels, setCollapsedPanels] = useState<
    Record<string, boolean>
  >({});

  const handlePanelCollapsedChange = (id: string, isCollapsed: boolean) => {
    setCollapsedPanels((prev) => ({
      ...prev,
      [id]: isCollapsed,
    }));
  };

  // State for dynamic center panels
  const [leftCenterSections, setLeftCenterSections] = useState<
    CenterPanelSection[]
  >([
    { id: "l1", title: "Left Section 1", content: "Left Center Content 1" },
    { id: "l2", title: "Left Section 2", content: "Left Center Content 2" },
  ]);
  const [rightCenterSections, setRightCenterSections] = useState<
    CenterPanelSection[]
  >([
    { id: "r1", title: "Right Section 1", content: "Right Center Content 1" },
    { id: "r2", title: "Right Section 2", content: "Right Center Content 2" },
  ]);

  // Panel handlers
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

  const addLeftSection = () => {
    const newId = `l${leftCenterSections.length + 1}`;
    setLeftCenterSections([
      ...leftCenterSections,
      {
        id: newId,
        title: `Section ${leftCenterSections.length + 1}`,
        content: "New Section",
      },
    ]);
  };

  const addRightSection = () => {
    const newId = `r${rightCenterSections.length + 1}`;
    setRightCenterSections([
      ...rightCenterSections,
      {
        id: newId,
        title: `Section ${rightCenterSections.length + 1}`,
        content: "New Section",
      },
    ]);
  };

  const renderPanelGroup = (
    sections: CenterPanelSection[],
    addSection: () => void,
    isLeft: boolean
  ) => (
    <PanelGroup direction="vertical" className="h-full">
      {sections.map((section, index) => (
        <React.Fragment key={section.id}>
          <VerticalPanel
            id={section.id}
            isCollapsed={collapsedPanels[section.id]}
            onCollapsedChange={handlePanelCollapsedChange}
          >
            {section.content}
          </VerticalPanel>
          {index < sections.length - 1 &&
            !collapsedPanels[section.id] &&
            !collapsedPanels[sections[index + 1].id] && <PanelResizeHandle />}
        </React.Fragment>
      ))}
      <PanelResizeHandle />
      <VerticalPanel id={isLeft ? "left-bottom" : "right-bottom"} isBottomPanel>
        Flexible Bottom Section
      </VerticalPanel>
      <Button variant="ghost" className="w-full mt-2" onClick={addSection}>
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>
    </PanelGroup>
  );

  return (
    <div className="flex flex-col h-full p-0 space-y-0 bg-background">
      {/* Header */}
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

      {/* Main Panel Group */}
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

        {/* Left Center Panel Group */}
        <Panel>
          {renderPanelGroup(leftCenterSections, addLeftSection, true)}
        </Panel>

        <PanelResizeHandle />

        {/* Right Center Panel Group */}
        <Panel>
          {renderPanelGroup(rightCenterSections, addRightSection, false)}
        </Panel>

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
