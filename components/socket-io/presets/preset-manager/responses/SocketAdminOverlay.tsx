"use client";

import React, { useState } from "react";
import { SocketPresetResponseProps } from "../SocketPresetManager";
import { SocketTasksTab } from "./admin-tabs/SocketTasksTab";
import { SocketTextResponseTab } from "./admin-tabs/SocketTextResponseTab";
import { SocketDataResponseTab } from "./admin-tabs/SocketDataResponseTab";

import FullScreenOverlay, { TabDefinition } from "@/components/official/FullScreenOverlay";
import SocketInfoResponseTab from "./admin-tabs/SocketInfoResponseTab";
import SocketErrorResponseTab from "./admin-tabs/SocketErrorResponseTab";
import { SocketBookmarkTab, BookmarkTabConfig } from "./admin-tabs/SocketBookmarkTab";

export interface SocketAdminOverlayProps extends SocketPresetResponseProps {
  // Override props for admin overlay
  overlayTitle?: string;
  overlayDescription?: string;
  showOverlay?: boolean;
  onClose?: () => void;
  
  // Custom bookmark tabs
  customTabs?: BookmarkTabConfig[];
}

/**
 * Admin overlay that provides full access to all socket task and response data
 * 
 * This component:
 * - Shows all tasks, listeners, and responses in Redux
 * - Initializes with the current taskId but allows browsing all data
 * - Uses FullScreenOverlay with multiple tabs
 * - Persists across multiple executions (doesn't reset data)
 * - Provides JSON exploration and markdown viewing for responses
 */
export const SocketAdminOverlay: React.FC<SocketAdminOverlayProps> = ({
  taskId,
  isExecuting = false,
  error,
  overlayTitle = "Socket Admin Panel",
  overlayDescription = "Full access to all socket tasks and responses",
  showOverlay = false,
  onClose,
  customTabs = [],
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskId);

  // Use showOverlay prop to control visibility
  const isOverlayOpen = showOverlay;

  // Update selected task when new taskId comes in
  React.useEffect(() => {
    if (taskId) {
      setSelectedTaskId(taskId);
    }
  }, [taskId]);

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent event bubbling
    onClose?.();
  };

  // Define base tabs for the overlay
  const baseTabs: TabDefinition[] = [
    {
      id: "tasks",
      label: "Tasks",
      content: (
        <SocketTasksTab
          currentTaskId={selectedTaskId}
          onTaskIdChange={setSelectedTaskId}
          isExecuting={isExecuting}
          error={error}
        />
      ),
    },
    {
      id: "text",
      label: "Text",
      content: (
        <SocketTextResponseTab
          taskId={selectedTaskId}
          onTaskIdChange={setSelectedTaskId}
          isExecuting={isExecuting}
          error={error}
        />
      ),
    },
    {
      id: "data",
      label: "Data",
      content: (
        <SocketDataResponseTab
          taskId={selectedTaskId}
          onTaskIdChange={setSelectedTaskId}
          isExecuting={isExecuting}
          error={error}
        />
      ),
    },
    {
      id: "info",
      label: "Info",
      content: (
        <SocketInfoResponseTab
          taskId={selectedTaskId}
          isExecuting={isExecuting}
          error={error}
        />
      ),
    },
    {
      id: "errors",
      label: "Error",
      content: (
        <SocketErrorResponseTab
          taskId={selectedTaskId}
          isExecuting={isExecuting}
          error={error}
        />
      ),
    },
  ];

  // Add custom bookmark tabs
  const customTabDefinitions: TabDefinition[] = customTabs.map((config, index) => ({
    id: `custom-${index}`,
    label: config.tabName,
    content: (
      <SocketBookmarkTab
        taskId={selectedTaskId}
        onTaskIdChange={setSelectedTaskId}
        config={config}
        isExecuting={isExecuting}
        error={error}
      />
    ),
  }));

  // Combine base and custom tabs
  const tabs: TabDefinition[] = [...baseTabs, ...customTabDefinitions];

  // If overlay is not open, render nothing
  if (!isOverlayOpen) {
    return null;
  }

  return (
    <FullScreenOverlay
      isOpen={isOverlayOpen}
      onClose={handleClose}
      title={overlayTitle}
      description={overlayDescription}
      tabs={tabs}
      initialTab="tasks"
      width="95vw"
      height="95vh"
    />
  );
};

export default SocketAdminOverlay; 