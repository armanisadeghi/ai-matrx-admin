"use client";

import React, { useEffect, useRef } from "react";
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { ActivityBar } from "../activity-bar/ActivityBar";
import { EditorArea } from "../editor/EditorArea";
import { BottomPanel } from "../terminal/BottomPanel";
import { SidePanelRouter } from "../views/SidePanelRouter";
import { StatusBar } from "./StatusBar";
import {
  selectActiveView,
  selectFarRightOpen,
  selectRightOpen,
  selectSideOpen,
  selectTerminalOpen,
  setFarRightOpen,
  setRightOpen,
  setSideOpen,
  setTerminalOpen,
} from "../redux";
import { PANE_BORDER, SIDE_PANEL_BG, WORKSPACE_BG } from "../styles/tokens";

export interface WorkspaceLayoutProps {
  rightSlot?: React.ReactNode;
  farRightSlot?: React.ReactNode;
  showStatusBar?: boolean;
  className?: string;
}

/**
 * Top-level VSCode-style layout.
 *
 *   ┌──┬──────────┬────────────────────────────┬──────────┬──────────┐
 *   │AB│ SidePnl  │            Editor           │  Right   │ FarRight │
 *   │  │          ├────────────────────────────┤   slot   │   slot   │
 *   │  │          │          Bottom             │          │          │
 *   └──┴──────────┴────────────────────────────┴──────────┴──────────┘
 *                                  StatusBar
 *
 * All collapsible panels are driven by react-resizable-panels imperative
 * handles so we can both keep the split ratios user-adjustable *and* flip
 * individual panes to collapsed at the click of a button.
 */
export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  rightSlot,
  farRightSlot,
  showStatusBar = true,
  className,
}) => {
  const dispatch = useAppDispatch();
  const activeView = useAppSelector(selectActiveView);
  const sideOpen = useAppSelector(selectSideOpen);
  const rightOpen = useAppSelector(selectRightOpen);
  const farRightOpen = useAppSelector(selectFarRightOpen);
  const terminalOpen = useAppSelector(selectTerminalOpen);

  const sideRef = useRef<PanelImperativeHandle>(null);
  const rightRef = useRef<PanelImperativeHandle>(null);
  const farRightRef = useRef<PanelImperativeHandle>(null);
  const bottomRef = useRef<PanelImperativeHandle>(null);

  // Sync Redux flags → panel collapsed/expanded state.
  useEffect(() => {
    const ref = sideRef.current;
    if (!ref) return;
    if (sideOpen && ref.isCollapsed()) ref.expand();
    else if (!sideOpen && !ref.isCollapsed()) ref.collapse();
    // activeView also triggers: the slice expands the panel on view change.
  }, [sideOpen, activeView]);

  useEffect(() => {
    const ref = rightRef.current;
    if (!ref) return;
    if (rightOpen && ref.isCollapsed()) ref.expand();
    else if (!rightOpen && !ref.isCollapsed()) ref.collapse();
  }, [rightOpen]);

  useEffect(() => {
    const ref = farRightRef.current;
    if (!ref) return;
    if (farRightOpen && ref.isCollapsed()) ref.expand();
    else if (!farRightOpen && !ref.isCollapsed()) ref.collapse();
  }, [farRightOpen]);

  useEffect(() => {
    const ref = bottomRef.current;
    if (!ref) return;
    if (terminalOpen && ref.isCollapsed()) ref.expand();
    else if (!terminalOpen && !ref.isCollapsed()) ref.collapse();
  }, [terminalOpen]);

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden",
        WORKSPACE_BG,
        className,
      )}
    >
      <div className="flex min-h-0 flex-1">
        <ActivityBar />
        <ResizablePanelGroup
          orientation="horizontal"
          autoSave="matrx-code-body"
          className="h-full min-h-0 flex-1"
        >
          {/* ── Side panel (Explorer/Search/Git/etc.) ─────────────────── */}
          <ResizablePanel
            panelRef={sideRef}
            id="side"
            defaultSize={18}
            minSize={12}
            collapsible
            collapsedSize={0}
            onResize={(size) => dispatch(setSideOpen(size.asPercentage > 0))}
            className={cn("min-w-0 border-r", PANE_BORDER, SIDE_PANEL_BG)}
          >
            <SidePanelRouter />
          </ResizablePanel>
          <ResizableHandle />

          {/* ── Center split (Editor over Bottom panel) ───────────────── */}
          <ResizablePanel id="center" defaultSize={58} minSize={25}>
            <ResizablePanelGroup
              orientation="vertical"
              autoSave="matrx-code-center"
              className="h-full min-h-0"
            >
              <ResizablePanel id="editor" defaultSize={70} minSize={20}>
                <EditorArea
                  rightSlotAvailable={Boolean(rightSlot)}
                  farRightSlotAvailable={Boolean(farRightSlot)}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel
                panelRef={bottomRef}
                id="bottom"
                defaultSize={30}
                minSize={10}
                collapsible
                collapsedSize={0}
                onResize={(size) =>
                  dispatch(setTerminalOpen(size.asPercentage > 0))
                }
              >
                <BottomPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* ── Optional right slot (chat) ────────────────────────────── */}
          {rightSlot && (
            <>
              <ResizableHandle />
              <ResizablePanel
                panelRef={rightRef}
                id="right"
                defaultSize={rightOpen ? 16 : 0}
                minSize={12}
                collapsible
                collapsedSize={0}
                onResize={(size) =>
                  dispatch(setRightOpen(size.asPercentage > 0))
                }
                className={cn("min-w-0 border-l", PANE_BORDER)}
              >
                <div className="h-full overflow-hidden">{rightSlot}</div>
              </ResizablePanel>
            </>
          )}

          {/* ── Optional far-right slot (chat history) ────────────────── */}
          {farRightSlot && (
            <>
              <ResizableHandle />
              <ResizablePanel
                panelRef={farRightRef}
                id="farRight"
                defaultSize={farRightOpen ? 10 : 0}
                minSize={8}
                collapsible
                collapsedSize={0}
                onResize={(size) =>
                  dispatch(setFarRightOpen(size.asPercentage > 0))
                }
                className={cn("min-w-0 border-l", PANE_BORDER)}
              >
                <div className="h-full overflow-hidden">{farRightSlot}</div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
      {showStatusBar && (
        <StatusBar
          rightSlotAvailable={Boolean(rightSlot)}
          farRightSlotAvailable={Boolean(farRightSlot)}
        />
      )}
    </div>
  );
};
