'use client';

import React, { useRef, useState, useCallback } from "react";
import {
  Panel,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import { Card } from "@/components/ui/card";
import DraggableToolbar, { ToolbarAction } from "./DraggableToolbar";


interface VerticalPanelProps {
  id: string;
  order: number;
  label: string;
  labelOptions?: string[];
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  children?: React.ReactNode;
  className?: string;
  onLabelChange?: (id: string, newLabel: string) => void;
  onDelete?: (id: string) => void;
  onCopy?: (id: string) => void;
  onDragDrop?: (draggedId: string, targetId: string) => void;
  customActions?: ToolbarAction[];
  debug?: boolean;
  onDebugClick?: (id: string) => void;
}

export function VerticalPanel({
  id,
  order,
  label,
  labelOptions,
  defaultSize = 10,
  minSize = 10,
  maxSize = 75,
  children,
  className = "",
  onLabelChange,
  onDelete,
  onCopy,
  onDragDrop,
  customActions = [],
  debug,
  onDebugClick,
}: VerticalPanelProps) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [previousSize, setPreviousSize] = useState(defaultSize);

  const handleToggleCollapse = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
      panelRef.current?.resize(previousSize);
    } else {
      setPreviousSize(panelRef.current?.getSize() ?? defaultSize);
      setIsCollapsed(true);
      panelRef.current?.resize(0);
    }
  }, [isCollapsed, defaultSize, previousSize]);

  const handleSave = useCallback((panelId: string) => {
    const size = panelRef.current?.getSize();
    // You can implement save functionality here
    console.log(`Saving panel ${panelId} with size ${size}`);
  }, []);

  const handleDelete = useCallback((panelId: string) => {
    if (onDelete) {
      onDelete(panelId);
    }
  }, [onDelete]);

  const handleCopy = useCallback((panelId: string) => {
    if (onCopy) {
      onCopy(panelId);
    }
  }, [onCopy]);

  const renderToolbar = () => (
    <DraggableToolbar
      id={id}
      currentLabel={label}
      labelOptions={labelOptions}
      isCollapsed={isCollapsed}
      onLabelChange={onLabelChange}
      onDelete={handleDelete}
      onSave={handleSave}
      onCopy={handleCopy}
      onToggleCollapse={handleToggleCollapse}
      onDragDrop={onDragDrop}
      actions={customActions}
      debug={debug}
      onDebugClick={onDebugClick}
    />
  );

  if (isCollapsed) {
    return (
      <div className="flex-none border bg-background">
        {renderToolbar()}
      </div>
    );
  }

  return (
    <>
      <Panel
        ref={panelRef}
        order={order}
        defaultSize={defaultSize}
        minSize={minSize}
        maxSize={maxSize}
      >
        <Card className={`h-full p-0 overflow-hidden bg-background ${className}`}>
          {renderToolbar()}
          <div className="p-1 overflow-auto h-[calc(100%-2rem)]">
            {children}
          </div>
        </Card>
      </Panel>
      <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />
    </>
  );
}

// Optional: Create a container component for managing multiple panels
interface VerticalPanelsContainerProps {
  children: React.ReactNode;
}

export function VerticalPanelsContainer({ children }: VerticalPanelsContainerProps) {
  return (
    <div className="flex h-full">
      {children}
    </div>
  );
}