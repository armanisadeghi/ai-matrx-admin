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
  setFarRightOpen,
  setRightOpen,
  setSideOpen,
} from "../redux/codeWorkspaceSlice";
import {
  selectTerminalOpen,
  setOpen as setTerminalOpen,
} from "../redux/terminalSlice";
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
 * Panel sizing rules (react-resizable-panels v4):
 *   - All defaultSize / minSize / collapsedSize values are PERCENTAGE STRINGS
 *     (e.g. "18%"). Bare numbers in v4 are PIXELS — using them on the body
 *     group caused the sidebar to mount at 18px and the terminal at 30px,
 *     producing the hydration mismatch (server flex-grow != client flex-grow)
 *     and the visible "snap" on first effect tick.
 *   - Toggle behaviour goes through a single `groupRef.setLayout()` call —
 *     never `panel.collapse()` / `panel.expand()` for adjacent collapsibles
 *     (the lib's pivot trap pushes freed space into the immediate neighbour).
 *     The right + farRight columns sit side-by-side, so this matters.
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
   * Compute the full body-group layout from Redux state and apply via
   * `setLayout()` in one shot. Replaces the previous imperative
   * `collapse()`/`expand()` + rAF rebalance pair, which was racy AND hit
   * the v4 pivot trap (collapsing one of right/farRight pushed its freed
   * space into the other adjacent collapsible).
   *
   * Behaviour preserved from the old implementation:
   *   - When a panel is closed in Redux, its size is 0.
   *   - When a panel reopens, we keep the user's last drag size if it's
   *     within range; otherwise we fall back to the DESIRED_* target.
   *   - The center panel absorbs whatever remains.
   */
  useEffect(() => {
    const group = bodyGroupRef.current;
    if (!group) return;

    const current = group.getLayout();
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

    group.setLayout(layout);
  }, [
    sideOpen,
    activeView,
    rightOpen,
    farRightOpen,
    rightAvailable,
    farRightAvailable,
  ]);

  // Terminal lives in the inner vertical group with only one collapsible
  // panel (editor isn't collapsible) — no pivot trap, so the lib's
  // panel.collapse() / panel.expand() is safe and gives us automatic prior-
  // size memory for free.
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
          groupRef={bodyGroupRef}
          className="h-full min-h-0 flex-1"
        >
          {/* ── Side panel (Explorer/Search/Git/etc.) ─────────────────── */}
          <ResizablePanel
            id={PANEL_IDS.SIDE}
            defaultSize={`${DESIRED_SIDE}%`}
            minSize="12%"
            collapsible
            collapsedSize="0%"
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
          <ResizablePanel
            id={PANEL_IDS.CENTER}
            defaultSize="62%"
            minSize="25%"
          >
            <ResizablePanelGroup
              orientation="vertical"
              className="h-full min-h-0"
            >
              <ResizablePanel id="editor" defaultSize="70%" minSize="20%">
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
                defaultSize="30%"
                minSize="10%"
                collapsible
                collapsedSize="0%"
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
                id={PANEL_IDS.RIGHT}
                defaultSize={`${DESIRED_RIGHT}%`}
                minSize="12%"
                collapsible
                collapsedSize="0%"
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
                id={PANEL_IDS.FAR_RIGHT}
                defaultSize={`${DESIRED_FAR_RIGHT}%`}
                minSize="10%"
                collapsible
                collapsedSize="0%"
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
