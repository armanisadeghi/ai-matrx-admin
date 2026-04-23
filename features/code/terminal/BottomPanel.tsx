"use client";

import React from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectTerminalActiveTab,
  setTerminalActiveTab,
  setTerminalOpen,
} from "../redux";
import type { BottomTabId } from "../types";
import { BOTTOM_PANEL_BG, PANE_BORDER } from "../styles/tokens";
import { TerminalTab } from "./TerminalTab";
import { ProblemsTab } from "./ProblemsTab";
import { OutputTab } from "./OutputTab";
import { DebugConsoleTab } from "./DebugConsoleTab";
import { PortsTab } from "./PortsTab";

interface BottomPanelProps {
  onCollapse?: () => void;
  className?: string;
}

interface BottomTabDescriptor {
  id: BottomTabId;
  label: string;
}

const TABS: BottomTabDescriptor[] = [
  { id: "problems", label: "Problems" },
  { id: "output", label: "Output" },
  { id: "debug", label: "Debug Console" },
  { id: "terminal", label: "Terminal" },
  { id: "ports", label: "Ports" },
];

export const BottomPanel: React.FC<BottomPanelProps> = ({
  onCollapse,
  className,
}) => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectTerminalActiveTab);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border-t",
        PANE_BORDER,
        BOTTOM_PANEL_BG,
        className,
      )}
    >
      <div
        className={cn(
          "flex h-8 shrink-0 items-center justify-between border-b px-1",
          PANE_BORDER,
        )}
      >
        <div role="tablist" className="flex items-stretch">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => dispatch(setTerminalActiveTab(tab.id))}
              className={cn(
                "relative h-8 px-3 text-[11px] uppercase tracking-wide text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
                activeTab === tab.id && "text-neutral-900 dark:text-neutral-50",
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  aria-hidden
                  className="absolute inset-x-2 bottom-0 h-[2px] rounded-t bg-blue-500"
                />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 pr-1">
          <button
            type="button"
            aria-label="Hide panel"
            title="Hide Panel"
            onClick={() => {
              dispatch(setTerminalOpen(false));
              onCollapse?.();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            aria-label="Close panel"
            title="Close Panel"
            onClick={() => {
              dispatch(setTerminalOpen(false));
              onCollapse?.();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {/* Terminal is always mounted so xterm state (scrollback, input
       *  buffer, cursor position) survives tab switches. Other tabs render
       *  normally; when one of them is active, the terminal is hidden via
       *  `display:none`. */}
      <div className="relative flex-1 min-h-0">
        <div className={cn("h-full", activeTab === "terminal" && "hidden")}>
          {activeTab === "problems" && <ProblemsTab />}
          {activeTab === "output" && <OutputTab />}
          {activeTab === "debug" && <DebugConsoleTab />}
          {activeTab === "ports" && <PortsTab />}
        </div>
        <div
          className={cn("h-full", activeTab !== "terminal" && "hidden")}
          aria-hidden={activeTab !== "terminal"}
        >
          <TerminalTab visible={activeTab === "terminal"} />
        </div>
      </div>
    </div>
  );
};
