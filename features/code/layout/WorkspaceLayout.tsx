"use client";

import React, { useEffect, useRef } from "react";
import type {
  GroupImperativeHandle,
  PanelImperativeHandle,
} from "react-resizable-panels";
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

/** Preferred percentages for each horizontal panel. These are targets we
 *  aim for whenever a panel toggles from collapsed → expanded; the user can
 *  then drag freely after that without us interfering. */
const DESIRED_SIDE = 18;
const DESIRED_RIGHT = 20;
const DESIRED_FAR_RIGHT = 16;

const PANEL_IDS = {
  SIDE: "side",
  CENTER: "center",
  RIGHT: "right",
  FAR_RIGHT: "farRight",
} as const;

/**
 * Top-level VSCode-style layout.
 *
 * ┌──┬──────────┬────────────────────────────┬──────────┬──────────┐
 * │AB│ SidePnl  │            Editor           │  Right   │ FarRight │
 * │  │          ├────────────────────────────┤   slot   │   slot   │
 * │  │          │          Bottom             │          │          │
 * └──┴──────────┴────────────────────────────┴──────────┴──────────┘
 *                                StatusBar
 *
 * Every panel is user-draggable. In addition, toggle buttons in the editor
 * toolbar + status bar collapse/expand panels deterministically: whenever a
 * side or right-side panel expands, we rebalance the layout so the newly
 * revealed space is taken *from the center* — never from a sibling right
 * panel. This keeps chat and chat-history cleanly adjacent instead of
 * competing for the same column.
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

  const bodyGroupRef = useRef<GroupImperativeHandle | null>(null);
  const sideRef = useRef<PanelImperativeHandle>(null);
  const rightRef = useRef<PanelImperativeHandle>(null);
  const farRightRef = useRef<PanelImperativeHandle>(null);
  const bottomRef = useRef<PanelImperativeHandle>(null);

  const rightAvailable = Boolean(rightSlot);
  const farRightAvailable = Boolean(farRightSlot);

  /** Only one panel can be the rightmost (avatar-colliding) column. Priority,
   *  from right to left: farRight > right > editor. */
  const farRightIsRightmost = farRightAvailable && farRightOpen;
  const rightIsRightmost = !farRightIsRightmost && rightAvailable && rightOpen;
  const editorIsRightmost = !farRightIsRightmost && !rightIsRightmost;

  const decoratedRightSlot = React.isValidElement(rightSlot)
    ? React.cloneElement(
        rightSlot as React.ReactElement<{ rightmost?: boolean }>,
        { rightmost: rightIsRightmost },
      )
    : rightSlot;
  const decoratedFarRightSlot = React.isValidElement(farRightSlot)
    ? React.cloneElement(
        farRightSlot as React.ReactElement<{ rightmost?: boolean }>,
        { rightmost: farRightIsRightmost },
      )
    : farRightSlot;

  /**
   * Collapse/expand individual panels imperatively, then rebalance so that
   * newly revealed/surrendered space flows to/from the *center* panel —
   * never siblings. This keeps chat and chat-history cleanly adjacent
   * instead of fighting each other for the same column.
   */
  useEffect(() => {
    const group = bodyGroupRef.current;
    if (!group) return;

    const side = sideRef.current;
    const right = rightAvailable ? rightRef.current : null;
    const farRight = farRightAvailable ? farRightRef.current : null;

    // Apply collapse/expand first so the panel runtime knows each panel's
    // desired "on/off" state before we set the layout sizes.
    if (side) {
      if (sideOpen && side.isCollapsed()) side.expand();
      else if (!sideOpen && !side.isCollapsed()) side.collapse();
    }
    if (right) {
      if (rightOpen && right.isCollapsed()) right.expand();
      else if (!rightOpen && !right.isCollapsed()) right.collapse();
    }
    if (farRight) {
      if (farRightOpen && farRight.isCollapsed()) farRight.expand();
      else if (!farRightOpen && !farRight.isCollapsed()) farRight.collapse();
    }

    // Next tick: the group's reported sizes update after imperative
    // collapse/expand calls. Rebalance using desired sizes for each open
    // panel, stealing any remaining space from center. We preserve the
    // user's existing drag size (if they resized the panel) but fall back
    // to the DESIRED_* target when a panel was just re-opened.
    const id = requestAnimationFrame(() => {
      const g = bodyGroupRef.current;
      if (!g) return;
      const current = g.getLayout();
      const preserve = (val: number | undefined, target: number) =>
        typeof val === "number" && val >= target / 2 ? val : target;

      const sideSize = sideOpen
        ? preserve(current[PANEL_IDS.SIDE], DESIRED_SIDE)
        : 0;
      const rightSize =
        rightAvailable && rightOpen
          ? preserve(current[PANEL_IDS.RIGHT], DESIRED_RIGHT)
          : 0;
      const farRightSize =
        farRightAvailable && farRightOpen
          ? preserve(current[PANEL_IDS.FAR_RIGHT], DESIRED_FAR_RIGHT)
          : 0;

      const centerSize = Math.max(
        100 - sideSize - rightSize - farRightSize,
        25,
      );
      const total = sideSize + centerSize + rightSize + farRightSize;
      const scale = 100 / total;

      const layout: Record<string, number> = {
        [PANEL_IDS.SIDE]: sideSize * scale,
        [PANEL_IDS.CENTER]: centerSize * scale,
      };
      if (rightAvailable) layout[PANEL_IDS.RIGHT] = rightSize * scale;
      if (farRightAvailable) layout[PANEL_IDS.FAR_RIGHT] = farRightSize * scale;

      g.setLayout(layout);
    });

    return () => cancelAnimationFrame(id);
  }, [
    sideOpen,
    activeView,
    rightOpen,
    farRightOpen,
    rightAvailable,
    farRightAvailable,
  ]);

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
          groupRef={bodyGroupRef}
          className="h-full min-h-0 flex-1"
        >
          {/* ── Side panel (Explorer/Search/Git/etc.) ─────────────────── */}
          <ResizablePanel
            panelRef={sideRef}
            id={PANEL_IDS.SIDE}
            defaultSize={DESIRED_SIDE}
            minSize={12}
            collapsible
            collapsedSize={0}
            onResize={(size) => {
              const open = size.asPercentage > 0;
              if (open !== sideOpen) dispatch(setSideOpen(open));
            }}
            className={cn("min-w-0 border-r", PANE_BORDER, SIDE_PANEL_BG)}
          >
            <SidePanelRouter />
          </ResizablePanel>
          <ResizableHandle />

          {/* ── Center split (Editor over Bottom panel) ───────────────── */}
          <ResizablePanel id={PANEL_IDS.CENTER} defaultSize={62} minSize={25}>
            <ResizablePanelGroup
              orientation="vertical"
              autoSave="matrx-code-center"
              className="h-full min-h-0"
            >
              <ResizablePanel id="editor" defaultSize={70} minSize={20}>
                <EditorArea
                  rightSlotAvailable={rightAvailable}
                  farRightSlotAvailable={farRightAvailable}
                  rightmost={editorIsRightmost}
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
                onResize={(size) => {
                  const open = size.asPercentage > 0;
                  if (open !== terminalOpen) dispatch(setTerminalOpen(open));
                }}
              >
                <BottomPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* ── Optional right slot (chat) ────────────────────────────── */}
          {rightAvailable && (
            <>
              <ResizableHandle />
              <ResizablePanel
                panelRef={rightRef}
                id={PANEL_IDS.RIGHT}
                defaultSize={DESIRED_RIGHT}
                minSize={12}
                collapsible
                collapsedSize={0}
                onResize={(size) => {
                  const open = size.asPercentage > 0;
                  if (open !== rightOpen) dispatch(setRightOpen(open));
                }}
                className={cn("min-w-0 border-l", PANE_BORDER)}
              >
                <div className="h-full overflow-hidden">
                  {decoratedRightSlot}
                </div>
              </ResizablePanel>
            </>
          )}

          {/* ── Optional far-right slot (chat history) ────────────────── */}
          {farRightAvailable && (
            <>
              <ResizableHandle />
              <ResizablePanel
                panelRef={farRightRef}
                id={PANEL_IDS.FAR_RIGHT}
                defaultSize={DESIRED_FAR_RIGHT}
                minSize={10}
                collapsible
                collapsedSize={0}
                onResize={(size) => {
                  const open = size.asPercentage > 0;
                  if (open !== farRightOpen) dispatch(setFarRightOpen(open));
                }}
                className={cn("min-w-0 border-l", PANE_BORDER)}
              >
                <div className="h-full overflow-hidden">
                  {decoratedFarRightSlot}
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
      {showStatusBar && (
        <StatusBar
          rightSlotAvailable={rightAvailable}
          farRightSlotAvailable={farRightAvailable}
        />
      )}
    </div>
  );
};
