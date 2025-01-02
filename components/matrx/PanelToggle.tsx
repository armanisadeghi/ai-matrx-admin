import React, { useState } from "react";
import {
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  PanelTopOpen,
  PanelTopClose,
  PanelBottomOpen,
  PanelBottomClose,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PanelToggleProps {
  /** The side of the panel being controlled */
  side?: "left" | "right" | "top" | "bottom";
  /** Size of the icon */
  size?: number;
  /** Whether the panel is collapsed - only used when controlling state externally */
  isCollapsed?: boolean;
  /** Optional callback for when toggle is clicked */
  onToggle?: (isCollapsed: boolean) => void;
  /** Optional className to be merged with defaults */
  className?: string;
  /** Panel name for accessibility */
  panelName?: string;
  /** Whether to manage state internally (defaults to true if no onToggle provided) */
  useInternalState?: boolean;
}

const PanelToggle = ({
  side = "left",
  size = 24,
  isCollapsed: externalIsCollapsed,
  onToggle,
  className,
  panelName = "Panel",
  useInternalState = !onToggle,
}: PanelToggleProps) => {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);

  const isCollapsed = useInternalState
    ? internalIsCollapsed
    : externalIsCollapsed;

  const handleClick = () => {
    if (useInternalState) {
      setInternalIsCollapsed(!internalIsCollapsed);
      onToggle?.(!internalIsCollapsed);
    } else {
      onToggle?.(!externalIsCollapsed);
    }
  };

  // Select the appropriate icon based on side and state
  const Icon = (() => {
    switch (side) {
      case "left":
        return isCollapsed ? PanelLeftOpen : PanelLeftClose;
      case "right":
        return isCollapsed ? PanelRightOpen : PanelRightClose;
      case "top":
        return isCollapsed ? PanelTopOpen : PanelTopClose;
      case "bottom":
        return isCollapsed ? PanelBottomOpen : PanelBottomClose;
      default:
        return PanelLeftOpen; // Fallback to left as default
    }
  })();

  return (
    <div
      onClick={handleClick}
      className={cn(
        "cursor-pointer p-1.5 hover:opacity-80 rounded-md transition-colors text-muted-foreground",
        className
      )}
      title={`${isCollapsed ? "Open" : "Close"} ${panelName}`}
    >
      <Icon size={size} />
    </div>
  );
};

export default PanelToggle;
