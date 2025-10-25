"use client";

import React, { useRef, useState } from "react"; // Removed unused useEffect
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import ReduxLogViewer from "@/utils/logger/components/ReduxLogViewer";
import { Card } from "@/components/ui/card";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import BucketSelector from "@/components/file-system/tree/BucketSelector";
import FileTree from "./components/FileExplorer/FileTree";
import BasicFolderTree from "./components/FileExplorer/BasicFolderTree";
import { Button } from "@/components/ui/button";
import { PanelLeft, PanelRight } from "lucide-react";
import TestDialogsPage from "./components/FileExplorer/DialogTester";
import { FileSystemProvider } from "@/lib/redux/fileSystem/Provider";

const LogPanel = () => (
  <MatrxDynamicPanel
    initialPosition="left"
    defaultExpanded={false}
    expandButtonProps={{
      label: "Redux Logs",
    }}
  >
    <ReduxLogViewer />
  </MatrxDynamicPanel>
);

const FileExplorerLayout = ({ children }: { children: React.ReactNode }) => {
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  const onLeftPanelChange = () => {
    const panel = leftPanelRef.current;
    if (panel) {
      setIsLeftCollapsed(panel.isCollapsed());
    }
  };

  const onRightPanelChange = () => {
    const panel = rightPanelRef.current;
    if (panel) {
      setIsRightCollapsed(panel.isCollapsed());
    }
  };

  const openLeftPanel = () => {
    const panel = leftPanelRef.current;
    if (panel) {
      panel.resize(12);
    }
  };

  const openRightPanel = () => {
    const panel = rightPanelRef.current;
    if (panel) {
      panel.resize(12);
    }
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
              title="Open File Explorer"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <BucketSelector />
        </div>
        {isRightCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={openRightPanel}
            title="Open Folder Selection"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        )}
      </Card>

      <PanelGroup direction="horizontal" className="flex-1">
        <Panel
          defaultSize={12}
          minSize={5}
          maxSize={40}
          collapsible
          ref={leftPanelRef}
          onCollapse={onLeftPanelChange}
          onExpand={onLeftPanelChange}
        >
          <TestDialogsPage />
          <Card className="h-full p-2 overflow-y-auto bg-background">
            <div className="font-semibold m-2">File Explorer</div>
            <FileTree />
          </Card>
        </Panel>

        <PanelResizeHandle />

        <Panel>
          <Card className="h-full p-2 flex flex-col overflow-hidden bg-background min-w-0">
            {children}
          </Card>
        </Panel>

        <PanelResizeHandle />

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
            <div className="font-semibold m-2">Folder Selection</div>
            <BasicFolderTree />
          </Card>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const allowedBuckets = ["userContent", "Audio", "Images", "Documents", "Code", "Videos", "any-file"] as const;

  return (
    <FileSystemProvider 
      initialBucket="Images"
      allowedBuckets={allowedBuckets}
    >
      <div className="flex flex-col h-full">
        <LogPanel />
        <main className="flex-1">
          <FileExplorerLayout>{children}</FileExplorerLayout>
        </main>
      </div>
    </FileSystemProvider>
  );
}
