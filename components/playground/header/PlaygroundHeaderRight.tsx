"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Code, Play } from "lucide-react";
import PlaygroundActionsDropdown from "./PlaygroundActionsDropdown";
import PanelToggle from "@/components/matrx/PanelToggle";
import { UseAiCockpitHook } from "../hooks/useAiCockpit";



interface PlaygroundHeaderRightProps {
  isRightCollapsed?: boolean;
  onToggleSettings: () => void;
  onShowCode: () => void;
  onPlay: () => void;
  fullScreenToggleButton?: React.ReactNode;
  aiCockpitHook: UseAiCockpitHook;
}

const PlaygroundHeaderRight = ({
  isRightCollapsed,
  onToggleSettings,
  onShowCode,
  onPlay,
  fullScreenToggleButton,
  aiCockpitHook,
}: PlaygroundHeaderRightProps) => {
  const handleSettingsToggle = (newIsCollapsed: boolean) => {
    onToggleSettings();
  };

  return (
    <div className="flex items-center pr-4 space-x-3">
      <Button
        size="sm"
        className="gap-2 bg-primary hover:bg-primaryHover h-8 px-4"
        onClick={onPlay}
      >
        <Play size={16} className="fill-current" />
        <span className="text-sm">Run</span>
      </Button>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onShowCode}
          className="h-8 w-8 p-0"
        >
          <Code size={18} />
        </Button>
        {fullScreenToggleButton}

        <PlaygroundActionsDropdown />

        <PanelToggle
          side="right"
          size={24}
          isCollapsed={isRightCollapsed}
          onToggle={handleSettingsToggle}
          panelName="Settings Panel"
          useInternalState={false}
        />

      </div>
    </div>
  );
};

export default PlaygroundHeaderRight;