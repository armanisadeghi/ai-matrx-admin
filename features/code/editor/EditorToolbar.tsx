"use client";

import React from "react";
import {
  MessageSquare,
  PanelBottom,
  PanelRight,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectFarRightOpen,
  selectRightOpen,
  selectTerminalOpen,
  setFarRightOpen,
  setRightOpen,
  setTerminalOpen,
} from "../redux";

interface EditorToolbarProps {
  rightSlotAvailable: boolean;
  farRightSlotAvailable: boolean;
  className?: string;
}

/**
 * VSCode-style compact toolbar on the right end of the editor tab strip —
 * gives the user obvious toggle handles for the terminal, chat panel, and
 * chat-history panel. Complements the buttons already in the StatusBar.
 */
export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  rightSlotAvailable,
  farRightSlotAvailable,
  className,
}) => {
  const dispatch = useAppDispatch();
  const terminalOpen = useAppSelector(selectTerminalOpen);
  const rightOpen = useAppSelector(selectRightOpen);
  const farRightOpen = useAppSelector(selectFarRightOpen);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 border-l border-neutral-200 bg-neutral-100 px-1 dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <ToolbarButton
        icon={PanelBottom}
        active={terminalOpen}
        label={terminalOpen ? "Close Panel (Ctrl+`)" : "Open Panel (Ctrl+`)"}
        onClick={() => dispatch(setTerminalOpen(!terminalOpen))}
      />
      {rightSlotAvailable && (
        <ToolbarButton
          icon={MessageSquare}
          active={rightOpen}
          label={rightOpen ? "Hide Chat" : "Show Chat"}
          onClick={() => dispatch(setRightOpen(!rightOpen))}
        />
      )}
      {farRightSlotAvailable && (
        <ToolbarButton
          icon={farRightOpen ? PanelRightOpen : PanelRight}
          active={farRightOpen}
          label={farRightOpen ? "Hide History" : "Show History"}
          onClick={() => dispatch(setFarRightOpen(!farRightOpen))}
        />
      )}
    </div>
  );
};

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
        active &&
          "bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
      )}
    >
      <Icon size={14} />
    </button>
  );
}
