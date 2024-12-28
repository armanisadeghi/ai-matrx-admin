import React, { useRef, useState } from "react";
import {
  Panel,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expand, Minimize2 } from "lucide-react";

interface VerticalPanelProps {
  id: string;
  order: number;
  children?: React.ReactNode;
}

export function VerticalPanel({ id, order, children }: VerticalPanelProps) {
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
        collapsed
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
          <div className="p-1">
            
            {children}
            
            </div>
        </Card>
      </Panel>
      <PanelResizeHandle />
    </>
  );
}
