"use client";

import React from "react";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import PlaygroundHeaderLeft from "./PlaygroundHeaderLeft";
import PlaygroundHeaderCenter from "./PlaygroundHeaderCenter";
import PlaygroundHeaderRight from "./PlaygroundHeaderRight";
import { DoubleJoinedActiveParentProcessingHook } from "@/app/entities/hooks/relationships/useRelationshipsWithProcessing";

interface PlaygroundHeaderProps {
  initialSettings?: {
    recipe?: QuickReferenceRecord;
    version?: number;
  };
  onToggleBrokers?: () => void;
  onToggleSettings?: () => void;
  onShowCode?: () => void;
  currentMode?: string;
  onNewRecipe?: () => void;
  onModeChange?: (mode: string) => void;
  onVersionChange?: (version: number) => void;
  onPlay?: () => void;
  isLeftCollapsed?: boolean;
  isRightCollapsed?: boolean;
  fullScreenToggleButton?: React.ReactNode;
  doubleParentActiveRecipeHook: DoubleJoinedActiveParentProcessingHook;
}

const PlaygroundHeader = ({
  initialSettings = {},
  onToggleBrokers = () => {},
  onToggleSettings = () => {},
  onShowCode = () => {},
  currentMode = "prompt",
  onModeChange = () => {},
  onNewRecipe = () => {},
  onVersionChange = () => {},
  onPlay = () => {},
  isLeftCollapsed,
  isRightCollapsed,
  fullScreenToggleButton,
  doubleParentActiveRecipeHook,
}: PlaygroundHeaderProps) => {

  return (
    <>
      <div className="flex items-center bg-elevation1 border-border h-12">
        {/* Left section - single row, no wrap, items centered */}
        <div className="w-1/6 flex justify-start items-center whitespace-nowrap overflow-hidden">
          <PlaygroundHeaderLeft
            initialSettings={initialSettings}
            isLeftCollapsed={isLeftCollapsed}
            onToggleBrokers={onToggleBrokers}
            onVersionChange={onVersionChange}
          />
        </div>

        {/* Center section - single row, no wrap, items centered */}
        <div className="w-4/6 flex justify-start items-center whitespace-nowrap overflow-hidden">
          <PlaygroundHeaderCenter
            initialSettings={initialSettings}
            currentMode={currentMode}
            onModeChange={onModeChange}
            onNewRecipe={onNewRecipe}
            doubleParentActiveRecipeHook={doubleParentActiveRecipeHook}
          />
        </div>

        {/* Right section - single row, no wrap, items centered */}
        <div className="w-1/6 flex justify-end items-center whitespace-nowrap overflow-hidden">
          <PlaygroundHeaderRight
            isRightCollapsed={isRightCollapsed}
            onToggleSettings={onToggleSettings}
            onShowCode={onShowCode}
            onPlay={onPlay}
            fullScreenToggleButton={fullScreenToggleButton}
            doubleParentActiveRecipeHook={doubleParentActiveRecipeHook}
          />
        </div>
      </div>

    </>
  );
};

export default PlaygroundHeader;
