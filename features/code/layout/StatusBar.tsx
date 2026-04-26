"use client";

import React from "react";
import {
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  GitBranch,
  Layers,
  MessageSquare,
  PanelRightOpen,
  Terminal as TerminalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useCodeWorkspace } from "../CodeWorkspaceProvider";
import type { RootState } from "@/lib/redux/store.types";
import { resolveEnvironmentForTab } from "../editor/monaco-environments";
import { selectActiveTab } from "../redux/tabsSlice";
import {
  selectFarRightOpen,
  selectRightOpen,
  selectSideOpen,
  setFarRightOpen,
  setRightOpen,
  setSideOpen,
} from "../redux/codeWorkspaceSlice";
import {
  selectTerminalOpen,
  setOpen as setTerminalOpen,
} from "../redux/terminalSlice";

interface StatusBarProps {
  rightSlotAvailable?: boolean;
  farRightSlotAvailable?: boolean;
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  rightSlotAvailable = true,
  farRightSlotAvailable = true,
  className,
}) => {
  const dispatch = useAppDispatch();
  const { filesystem, process } = useCodeWorkspace();
  const activeTab = useAppSelector(selectActiveTab);
  const sideOpen = useAppSelector(selectSideOpen);
  const rightOpen = useAppSelector(selectRightOpen);
  const farRightOpen = useAppSelector(selectFarRightOpen);
  const terminalOpen = useAppSelector(selectTerminalOpen);
  const monacoEnvironmentsEnabled = useAppSelector(
    (state: RootState) =>
      state.userPreferences.coding.monacoEnvironmentsEnabled ?? true,
  );
  const activeEnvironment =
    monacoEnvironmentsEnabled && activeTab
      ? resolveEnvironmentForTab(activeTab)
      : null;

  return (
    <div
      className={cn(
        "flex h-6 shrink-0 items-center justify-between bg-blue-600 px-2 text-[11px] text-white dark:bg-blue-700",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => dispatch(setSideOpen(!sideOpen))}
          className="flex items-center gap-1 hover:bg-blue-700/50 dark:hover:bg-blue-800/50"
          aria-label="Toggle sidebar"
        >
          {sideOpen ? <ChevronsLeft size={12} /> : <ChevronsRight size={12} />}
          <span>Sidebar</span>
        </button>
        <div className="flex items-center gap-1">
          <GitBranch size={12} />
          <span>{filesystem.label}</span>
        </div>
        {process.isReady && (
          <div className="flex items-center gap-1">
            <TerminalIcon size={12} />
            <span>{process.cwd}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {activeTab && (
          <>
            <span>{activeTab.language}</span>
            <span>UTF-8</span>
            <span>LF</span>
            {activeEnvironment ? (
              <span
                className="flex items-center gap-1"
                title={
                  activeEnvironment.description ??
                  `Monaco type environment: ${activeEnvironment.label}`
                }
              >
                <Layers size={12} />
                <span>{activeEnvironment.label}</span>
              </span>
            ) : monacoEnvironmentsEnabled ? null : (
              <span
                className="flex items-center gap-1 opacity-70"
                title="Type environments are disabled in Code Workspace settings"
              >
                <Layers size={12} />
                <span>env: off</span>
              </span>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => dispatch(setTerminalOpen(!terminalOpen))}
          className="flex items-center gap-1 hover:bg-blue-700/50 dark:hover:bg-blue-800/50"
          aria-label="Toggle bottom panel"
        >
          <ChevronsDown size={12} />
          <span>{terminalOpen ? "Hide Panel" : "Show Panel"}</span>
        </button>
        {rightSlotAvailable && (
          <button
            type="button"
            onClick={() => dispatch(setRightOpen(!rightOpen))}
            className="flex items-center gap-1 hover:bg-blue-700/50 dark:hover:bg-blue-800/50"
            aria-label="Toggle chat panel"
          >
            <MessageSquare size={12} />
            <span>{rightOpen ? "Hide Chat" : "Show Chat"}</span>
          </button>
        )}
        {farRightSlotAvailable && (
          <button
            type="button"
            onClick={() => dispatch(setFarRightOpen(!farRightOpen))}
            className="flex items-center gap-1 hover:bg-blue-700/50 dark:hover:bg-blue-800/50"
            aria-label="Toggle chat history"
          >
            <PanelRightOpen size={12} />
            <span>{farRightOpen ? "Hide History" : "Show History"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
