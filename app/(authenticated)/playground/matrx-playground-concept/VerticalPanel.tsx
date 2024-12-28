import React, { useRef, useState } from "react";
import { Panel, ImperativePanelHandle } from "react-resizable-panels";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expand, Shrink } from "lucide-react";

interface VerticalPanelProps {
  id: string;
  children?: React.ReactNode;
}

export function VerticalPanel({
  id,
  children
}: VerticalPanelProps) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [previousSize, setPreviousSize] = useState(25);

  const toggleCollapse = () => {
    const panel = panelRef.current;
    if (!panel) return;

    if (isCollapsed) {
      panel.resize(previousSize);
    } else {
      setPreviousSize(panel.getSize());
      panel.resize(3);
    }
    setIsCollapsed(!isCollapsed);
  };

  return (
    <Panel
      ref={panelRef}
      defaultSize={25}
      minSize={3}
      maxSize={75}
    >
      <Card className="h-full p-0 overflow-hidden bg-background relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-0 right-0 h-6 w-6 p-0"
          onClick={toggleCollapse}
        >
          {isCollapsed ? (
            <Expand className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Shrink className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
        <div className={`p-1 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          {children}
        </div>
      </Card>
    </Panel>
  );
}