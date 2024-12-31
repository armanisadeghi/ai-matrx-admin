import React, { useState } from "react";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import PlaygroundHistoryDialog from "./PlaygroundHistoryDialog";
import PlaygroundHeaderLeft from "./PlaygroundHeaderLeft";
import PlaygroundHeaderCenter from "./PlaygroundHeaderCenter";
import PlaygroundHeaderRight from "./PlaygroundHeaderRight";

interface PlaygroundHeaderProps {
  initialSettings?: {
    recipe?: QuickReferenceRecord;
    version?: number;
  };
  onToggleBrokers?: () => void;
  onToggleSettings?: () => void;
  onShowCode?: () => void;
  currentMode?: string;
  onModeChange?: (mode: string) => void;
  onVersionChange?: (version: number) => void;
  onPlay?: () => void;
  isLeftCollapsed?: boolean;
  isRightCollapsed?: boolean;
}

const PlaygroundHeader = ({
  initialSettings = {},
  onToggleBrokers = () => {},
  onToggleSettings = () => {},
  onShowCode = () => {},
  currentMode = "prompt",
  onModeChange = () => {},
  onVersionChange = () => {},
  onPlay = () => {},
  isLeftCollapsed,
  isRightCollapsed,
}: PlaygroundHeaderProps) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div className="flex items-center bg-elevation1 border-border h-12">
      <PlaygroundHeaderLeft
        initialSettings={initialSettings}
        isLeftCollapsed={isLeftCollapsed}
        onToggleBrokers={onToggleBrokers}
        onVersionChange={onVersionChange}
        onHistoryOpen={() => setIsHistoryOpen(true)}
      />

      <PlaygroundHeaderCenter
        currentMode={currentMode}
        onModeChange={onModeChange}
      />

      <PlaygroundHeaderRight
        isRightCollapsed={isRightCollapsed}
        onToggleSettings={onToggleSettings}
        onShowCode={onShowCode}
        onPlay={onPlay}
      />

      <PlaygroundHistoryDialog
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />
    </div>
  );
};

export default PlaygroundHeader;