import React, { useRef, useState } from "react";
import { Panel, ImperativePanelHandle } from "react-resizable-panels";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expand, Minimize2 } from "lucide-react";

interface VerticalPanelProps {
    id: string;
    children?: React.ReactNode;
    isBottomPanel?: boolean;
    onCollapsedChange?: (id: string, isCollapsed: boolean) => void;
    isCollapsed?: boolean;
  }
  
  export function VerticalPanel({
    id,
    children,
    isBottomPanel = false,
    onCollapsedChange,
    isCollapsed: externalIsCollapsed,
  }: VerticalPanelProps) {
    const panelRef = useRef<ImperativePanelHandle>(null);
    const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
    const [previousSize, setPreviousSize] = useState(25);
  
    // Use external state if provided, otherwise use internal state
    const isCollapsed = externalIsCollapsed ?? internalIsCollapsed;
  
    const toggleCollapse = () => {
      const panel = panelRef.current;
      if (!panel) return;
  
      const newCollapsedState = !isCollapsed;
      if (newCollapsedState) {
        setPreviousSize(panel.getSize());
        panel.resize(3);
      } else {
        panel.resize(previousSize);
      }
      
      setInternalIsCollapsed(newCollapsedState);
      onCollapsedChange?.(id, newCollapsedState);
    };
  
    return (
      <Panel
        ref={panelRef}
        defaultSize={isBottomPanel ? 80 : 10}
        minSize={isBottomPanel ? 10 : 3}
        maxSize={isBottomPanel ? 100 : 75}
      >
        <Card className="h-full p-0 overflow-hidden bg-background relative">
          {!isBottomPanel && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0 h-6 w-6 p-0 z-10"
              onClick={toggleCollapse}
            >
          {isCollapsed ? (
            <Expand className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Minimize2 className="h-3 w-3 text-muted-foreground" />
          )}
          </Button>
        )}
        <div className={`p-1 ${isCollapsed && !isBottomPanel ? 'opacity-0' : 'opacity-100'}`}>
          {children}
        </div>
      </Card>
    </Panel>
  );
}