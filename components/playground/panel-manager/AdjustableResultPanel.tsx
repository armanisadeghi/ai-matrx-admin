"use client";

import React, { useRef, useState } from "react";
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { Button, Card } from "@/components/ui";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import { Expand, Minimize2 } from "lucide-react";

interface AdjustableResultPanelProps {
  id: string;
  order: number;
  number: number;
}

export function AdjustableResultPanel({
  id,
  order,
  number,
}: AdjustableResultPanelProps) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [previousSize, setPreviousSize] = useState(10);

  const toggleCollapse = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
    } else {
      setPreviousSize(panelRef.current?.getSize() ?? 10);
      setIsCollapsed(true);
    }
  };

  if (isCollapsed) {
    return (
      <div className="h-6 flex-none border bg-background relative">
        <span className="text-sm text-muted-foreground px-1">
          RESULT {number}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-0 right-0 h-6 w-6 p-0 z-10"
          onClick={toggleCollapse}
        >
          <Expand className="h-2 w-2 text-gray-500" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Panel
        ref={panelRef}
        order={order}
        defaultSize={previousSize}
        minSize={10}
        maxSize={75}
      >
        <Card className="h-full p-0 overflow-hidden bg-background relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-0 right-0 h-6 w-6 p-0 z-10"
            onClick={toggleCollapse}
          >
            <Minimize2 className="h-4 w-4 text-gray-500" />
          </Button>
          <div className="h-full flex flex-col">
            <div className="text-sm text-muted-foreground px-1">
              RESULT {number}
            </div>
            <div className="flex-1 p-2">
              <MarkdownRenderer
                content=""
                type="message"
                role="assistant"
                fontSize={12}
              />
            </div>
          </div>
        </Card>
      </Panel>
      <PanelResizeHandle />
    </>
  );
}
