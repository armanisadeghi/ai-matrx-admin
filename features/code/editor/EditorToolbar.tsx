"use client";

import React from "react";
import {
  MessageSquare,
  PanelBottom,
  PanelRight,
  PanelRightOpen,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectFarRightOpen,
  selectRightOpen,
  setFarRightOpen,
  setRightOpen,
} from "../redux/codeWorkspaceSlice";
import {
  selectTerminalOpen,
  setOpen as setTerminalOpen,
} from "../redux/terminalSlice";

interface EditorToolbarProps {
  rightSlotAvailable: boolean;
  farRightSlotAvailable: boolean;
  /** Trigger a save of the currently active editor tab. */
  onSaveActiveTab?: () => void;
  /** The active tab has unsaved edits — used to spotlight the save button. */
  hasDirtyActiveTab?: boolean;
  /** Whether there's an active tab at all (disables save when false). */
  hasActiveTab?: boolean;
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
  onSaveActiveTab,
  hasDirtyActiveTab = false,
  hasActiveTab = false,
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
      {onSaveActiveTab && (
        <ToolbarButton
          icon={Save}
          active={hasDirtyActiveTab}
          disabled={!hasActiveTab}
          label={
            hasDirtyActiveTab
              ? "Save (\u2318S)"
              : hasActiveTab
                ? "All changes saved"
                : "No file open"
          }
          onClick={onSaveActiveTab}
        />
      )}
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
  disabled = false,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
        active &&
          "bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
        disabled &&
          "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-neutral-500 dark:hover:bg-transparent dark:hover:text-neutral-400",
      )}
    >
      <Icon size={14} />
    </button>
  );
}
