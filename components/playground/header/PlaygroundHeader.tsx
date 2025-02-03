"use client";

import React from "react";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import PlaygroundHeaderLeft from "./PlaygroundHeaderLeft";
import PlaygroundHeaderCenter from "./PlaygroundHeaderCenter";
import PlaygroundHeaderRight from "./PlaygroundHeaderRight";
import { UseAiCockpitHook } from "@/app/entities/hooks/relationships/useRelationshipsWithProcessing";

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
  aiCockpitHook: UseAiCockpitHook;
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
  aiCockpitHook,
}: PlaygroundHeaderProps) => {

  return (
    <>
      <div className="flex items-center bg-elevation1 border-border h-12">
        {/* Left section - single row, no wrap, items centered */}
        <div className="w-1/6 flex justify-start items-center whitespace-nowrap overflow-hidden">
          <PlaygroundHeaderLeft
            isLeftCollapsed={isLeftCollapsed}
            onToggleBrokers={onToggleBrokers}
            onVersionChange={onVersionChange}
          />
        </div>

        {/* Center section - single row, no wrap, items centered */}
        <div className="w-4/6 flex justify-start items-center whitespace-nowrap overflow-hidden">
          <PlaygroundHeaderCenter
            currentMode={currentMode}
            onModeChange={onModeChange}
            onNewRecipe={onNewRecipe}
            aiCockpitHook={aiCockpitHook}
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
            aiCockpitHook={aiCockpitHook}
          />
        </div>
      </div>

    </>
  );
};

export default PlaygroundHeader;
