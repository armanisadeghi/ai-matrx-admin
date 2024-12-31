import React from "react";
import { Button } from "@/components/ui/button";
import { Code, Settings, Play } from "lucide-react";
import PlaygroundActionsDropdown from "./PlaygroundActionsDropdown";

interface PlaygroundHeaderRightProps {
  isRightCollapsed?: boolean;
  onToggleSettings: () => void;
  onShowCode: () => void;
  onPlay: () => void;
}

const PlaygroundHeaderRight = ({
  isRightCollapsed,
  onToggleSettings,
  onShowCode,
  onPlay,
}: PlaygroundHeaderRightProps) => {
  return (
    <div className="flex items-center px-2 gap-1">
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

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSettings}
          className="h-8 w-8 p-0"
          title={isRightCollapsed ? "Open Settings Panel" : "Close Settings Panel"}
        >
          <Settings size={18} />
        </Button>

        <PlaygroundActionsDropdown />
      </div>
    </div>
  );
};

export default PlaygroundHeaderRight;