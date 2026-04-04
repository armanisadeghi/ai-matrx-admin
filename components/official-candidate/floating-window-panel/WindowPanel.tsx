"use client";

/**
 * WindowPanel
 *
 * A floating, draggable, resizable, maximizable, minimizable OS-style window.
 *
 * Changes from v1:
 *  - Minimized and maximized states rendered via createPortal(document.body)
 *    so they always escape any parent stacking context / overflow:hidden.
 *  - Green traffic-light is single-click maximize (not double-click).
 *  - Green traffic-light shows an Apple-style dropdown on hover with
 *    "Move & Resize" options (snap left/right/top/bottom, centre) and
 *    "Enter Full Screen" / "Exit Full Screen".
 *  - Title is stored in Redux so WindowTray displays it correctly.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GripVertical,
  Minus,
  Maximize2,
  Minimize2,
  X,
  RectangleHorizontal,
  RectangleVertical,
  LayoutTemplate,
  Columns2,
  Rows2,
  AppWindow,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWindowPanel,
  type UseWindowPanelOptions,
  type ResizeEdge,
} from "./hooks/useWindowPanel";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  updateWindowRect,
  updateMinimizedPos,
} from "@/lib/redux/slices/windowManagerSlice";

const CHIP_WIDTH = 210;
const CHIP_HEIGHT = 64;

// ─── Resize handle descriptors ───────────────────────────────────────────────

interface HandleDef {
  edge: ResizeEdge;
  className: string;
}

const HANDLES: HandleDef[] = [
  {
    edge: "e",
    className: "absolute right-0 top-2 bottom-2 w-1.5 cursor-ew-resize",
  },
  {
    edge: "w",
    className: "absolute left-0 top-2 bottom-2 w-1.5 cursor-ew-resize",
  },
  {
    edge: "s",
    className: "absolute bottom-0 left-2 right-2 h-1.5 cursor-ns-resize",
  },
  {
    edge: "n",
    className: "absolute top-0 left-2 right-2 h-1.5 cursor-ns-resize",
  },
  {
    edge: "se",
    className: "absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize",
  },
  {
    edge: "sw",
    className: "absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize",
  },
  {
    edge: "ne",
    className: "absolute top-0 right-0 w-3 h-3 cursor-nesw-resize",
  },
  { edge: "nw", className: "absolute top-0 left-0 w-3 h-3 cursor-nwse-resize" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WindowPanelProps extends UseWindowPanelOptions {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  onClose?: () => void;
  bodyClassName?: string;
  className?: string;
  minWidth?: number;
  minHeight?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WindowPanel({
  children,
  title,
  actions,
  onClose,
  bodyClassName,
  className,
  minWidth,
  minHeight,
  ...hookOpts
}: WindowPanelProps) {
  // Pass title into hook so it reaches Redux
  const {
    id,
    windowState,
    rect,
    minimizedPos,
    zIndex,
    onDragStart,
    onChipDragStart,
    onResizeStart,
    onFocus,
    onRestore,
    onMaximize,
    onMinimize,
    onToggleMaximize,
  } = useWindowPanel({ ...hookOpts, title });

  const dispatch = useAppDispatch();

  // ── Portal target (client-only) ──────────────────────────────────────────
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Action nodes — stop drag propagation ────────────────────────────────
  const actionNodes = actions
    ? React.Children.toArray(
        React.isValidElement(actions) || typeof actions !== "object"
          ? [actions]
          : (actions as React.ReactNode),
      )
    : [];

  // ── Snap helpers (Move & Resize menu) ───────────────────────────────────
  const snapLeft = useCallback(() => {
    dispatch(
      updateWindowRect({
        id,
        rect: {
          x: 0,
          y: 0,
          width: Math.round(window.innerWidth / 2),
          height: window.innerHeight,
        },
      }),
    );
  }, [dispatch, id]);

  const snapRight = useCallback(() => {
    const half = Math.round(window.innerWidth / 2);
    dispatch(
      updateWindowRect({
        id,
        rect: {
          x: half,
          y: 0,
          width: window.innerWidth - half,
          height: window.innerHeight,
        },
      }),
    );
  }, [dispatch, id]);

  const snapTop = useCallback(() => {
    dispatch(
      updateWindowRect({
        id,
        rect: {
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: Math.round(window.innerHeight / 2),
        },
      }),
    );
  }, [dispatch, id]);

  const snapBottom = useCallback(() => {
    const half = Math.round(window.innerHeight / 2);
    dispatch(
      updateWindowRect({
        id,
        rect: {
          x: 0,
          y: half,
          width: window.innerWidth,
          height: window.innerHeight - half,
        },
      }),
    );
  }, [dispatch, id]);

  const snapCentre = useCallback(() => {
    const w = Math.min(rect.width, window.innerWidth);
    const h = Math.min(rect.height, window.innerHeight);
    dispatch(
      updateWindowRect({
        id,
        rect: {
          x: Math.round((window.innerWidth - w) / 2),
          y: Math.round((window.innerHeight - h) / 2),
          width: w,
          height: h,
        },
      }),
    );
  }, [dispatch, id, rect.width, rect.height]);

  // ── Shared header ────────────────────────────────────────────────────────
  const header = (
    <WindowHeader
      title={title}
      actionNodes={actionNodes}
      onDragStart={windowState === "windowed" ? onDragStart : undefined}
      onMinimize={onMinimize}
      onToggleMaximize={onToggleMaximize}
      onClose={onClose}
      onRestore={onRestore}
      isMaximized={windowState === "maximized"}
      snapLeft={snapLeft}
      snapRight={snapRight}
      snapTop={snapTop}
      snapBottom={snapBottom}
      snapCentre={snapCentre}
    />
  );

  // ────────────────────────────────────────────────────────────────────────
  // MINIMIZED — render a small draggable chip portalled to document.body.
  // The chip uses the same drag mechanism as the windowed header so it
  // moves freely anywhere on screen without any separate tray component.
  // ────────────────────────────────────────────────────────────────────────
  if (windowState === "minimized") {
    // On the very first minimize the stored pos is {0,0}; snap to bottom-right.
    const chipX =
      minimizedPos.x === 0 && minimizedPos.y === 0
        ? window.innerWidth - CHIP_WIDTH - 12
        : minimizedPos.x;
    const chipY =
      minimizedPos.x === 0 && minimizedPos.y === 0
        ? window.innerHeight - CHIP_HEIGHT - 12
        : minimizedPos.y;

    const chip = (
      <div
        className={cn(
          "fixed flex flex-col rounded-xl select-none overflow-hidden",
          "bg-card/95 backdrop-blur-md border border-border shadow-xl",
          "cursor-grab active:cursor-grabbing",
        )}
        style={{
          left: chipX,
          top: chipY,
          width: CHIP_WIDTH,
          height: CHIP_HEIGHT,
          zIndex,
        }}
        onMouseDown={(e) => {
          onFocus();
          onChipDragStart(e);
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 px-2.5 h-8 border-b border-border/50 bg-muted/40 shrink-0">
          {/* Traffic lights — stop drag so clicks register */}
          <div
            className="flex items-center gap-1 shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-2 h-2 opacity-0 hover:opacity-100" />
            </button>
            <div className="w-3 h-3 rounded-full bg-yellow-400/40 cursor-default" />
            <button
              type="button"
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center"
              onClick={onRestore}
              aria-label="Restore"
            >
              <Maximize2 className="w-2 h-2 opacity-0 hover:opacity-100" />
            </button>
          </div>
          <AppWindow className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate flex-1 text-xs font-semibold text-foreground/90">
            {title ?? ""}
          </span>
          <button
            type="button"
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onRestore}
            aria-label="Restore window"
          >
            <ChevronsUpDown className="h-3 w-3" />
          </button>
        </div>

        {/* Body — decorative preview bars */}
        <div
          className="flex items-center gap-2 px-3 flex-1"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onRestore}
        >
          <div className="flex-1 h-1.5 rounded-full bg-muted-foreground/20" />
          <div className="w-1/3 h-1.5 rounded-full bg-muted-foreground/10" />
        </div>
      </div>
    );

    // Sync the initial position into Redux so subsequent drags start from
    // the right place (only needed on first minimize when pos is still 0,0).
    if (minimizedPos.x === 0 && minimizedPos.y === 0 && portalTarget) {
      dispatch(
        updateMinimizedPos({ id, x: chipX, y: chipY }),
      );
    }

    return portalTarget ? createPortal(chip, portalTarget) : null;
  }

  // ────────────────────────────────────────────────────────────────────────
  // MAXIMIZED — portalled to body so it covers the full viewport
  // ────────────────────────────────────────────────────────────────────────
  if (windowState === "maximized") {
    const el = (
      <div
        className={cn(
          "fixed inset-0 flex flex-col",
          "bg-card/98 backdrop-blur-md border border-border shadow-2xl",
          "overflow-hidden",
        )}
        style={{ zIndex }}
        onMouseDown={onFocus}
      >
        {header}
        <div className={cn("flex-1 overflow-auto", bodyClassName)}>
          {children}
        </div>
      </div>
    );
    return portalTarget ? createPortal(el, portalTarget) : null;
  }

  // ────────────────────────────────────────────────────────────────────────
  // WINDOWED — portalled to body so it escapes any overflow:hidden parent
  // ────────────────────────────────────────────────────────────────────────
  const el = (
    <div
      className={cn(
        "fixed flex flex-col",
        "rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-xl",
        "overflow-hidden",
        className,
      )}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        zIndex,
        minWidth: minWidth ?? 180,
        minHeight: minHeight ?? 80,
      }}
      onMouseDown={onFocus}
    >
      {HANDLES.map((h) => (
        <div
          key={h.edge}
          className={cn(
            h.className,
            "z-10 hover:bg-primary/20 transition-colors",
          )}
          onMouseDown={onResizeStart(h.edge)}
        />
      ))}
      {header}
      <div className={cn("flex-1 overflow-auto min-h-0", bodyClassName)}>
        {children}
      </div>
    </div>
  );

  return portalTarget ? createPortal(el, portalTarget) : null;
}

// ─── WindowHeader ─────────────────────────────────────────────────────────────

interface WindowHeaderProps {
  title?: string;
  actionNodes: React.ReactNode[];
  onDragStart?: (e: React.MouseEvent) => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onRestore: () => void;
  onClose?: () => void;
  isMaximized: boolean;
  snapLeft: () => void;
  snapRight: () => void;
  snapTop: () => void;
  snapBottom: () => void;
  snapCentre: () => void;
}

function WindowHeader({
  title,
  actionNodes,
  onDragStart,
  onMinimize,
  onToggleMaximize,
  onRestore,
  onClose,
  isMaximized,
  snapLeft,
  snapRight,
  snapTop,
  snapBottom,
  snapCentre,
}: WindowHeaderProps) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-1.5 px-2 py-1.5 z-20",
        "border-b border-border/50 bg-muted/40 select-none shrink-0",
        onDragStart ? "cursor-grab active:cursor-grabbing" : "cursor-default",
      )}
      onMouseDown={onDragStart}
    >
      {/* Traffic-light controls */}
      <div
        className="flex items-center gap-1 shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Red — Close */}
        <TrafficLight
          color="red"
          icon={<X className="w-2 h-2" />}
          onClick={onClose ?? undefined}
          disabled={!onClose}
          aria-label="Close"
        />

        {/* Yellow — Minimize */}
        <TrafficLight
          color="yellow"
          icon={<Minus className="w-2 h-2" />}
          onClick={onMinimize}
          aria-label="Minimize"
        />

        {/* Green — Maximize / dropdown */}
        <GreenTrafficLight
          isMaximized={isMaximized}
          onToggleMaximize={onToggleMaximize}
          onRestore={onRestore}
          snapLeft={snapLeft}
          snapRight={snapRight}
          snapTop={snapTop}
          snapBottom={snapBottom}
          snapCentre={snapCentre}
        />
      </div>

      {onDragStart && (
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      )}

      <span className="text-xs font-medium text-foreground/80 flex-1 truncate">
        {title ?? ""}
      </span>

      {actionNodes.map((node, i) => (
        <div key={i} onMouseDown={(e) => e.stopPropagation()}>
          {node}
        </div>
      ))}
    </div>
  );
}

// ─── TrafficLight (red / yellow) ─────────────────────────────────────────────

interface TrafficLightProps {
  color: "red" | "yellow";
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}

function TrafficLight({
  color,
  icon,
  onClick,
  disabled,
  "aria-label": label,
}: TrafficLightProps) {
  const [hovered, setHovered] = useState(false);
  const base =
    "w-3 h-3 rounded-full flex items-center justify-center transition-colors shrink-0 relative";
  const colours =
    color === "red"
      ? disabled
        ? "bg-zinc-500 cursor-default"
        : "bg-red-500 hover:bg-red-400 cursor-pointer"
      : "bg-yellow-400 hover:bg-yellow-300 cursor-pointer";

  return (
    <button
      type="button"
      className={cn(base, colours)}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => e.stopPropagation()}
      aria-label={label}
      disabled={disabled}
    >
      <span
        className="transition-opacity"
        style={{ opacity: hovered && !disabled ? 1 : 0 }}
      >
        {icon}
      </span>
    </button>
  );
}

// ─── GreenTrafficLight (with dropdown) ───────────────────────────────────────

interface GreenTrafficLightProps {
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onRestore: () => void;
  snapLeft: () => void;
  snapRight: () => void;
  snapTop: () => void;
  snapBottom: () => void;
  snapCentre: () => void;
}

function GreenTrafficLight({
  isMaximized,
  onToggleMaximize,
  onRestore,
  snapLeft,
  snapRight,
  snapTop,
  snapBottom,
  snapCentre,
}: GreenTrafficLightProps) {
  const [hovered, setHovered] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openDropdown = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setDropdownOpen(true);
  };
  const scheduleClose = () => {
    leaveTimer.current = setTimeout(() => {
      setDropdownOpen(false);
      setHovered(false);
    }, 120);
  };

  const handleAction = (fn: () => void) => {
    setDropdownOpen(false);
    setHovered(false);
    fn();
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setHovered(true);
        openDropdown();
      }}
      onMouseLeave={scheduleClose}
    >
      {/* The dot */}
      <button
        type="button"
        className={cn(
          "w-3 h-3 rounded-full flex items-center justify-center transition-colors shrink-0",
          "bg-green-500 hover:bg-green-400 cursor-pointer",
        )}
        onClick={() => handleAction(onToggleMaximize)}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label={isMaximized ? "Restore" : "Maximize"}
      >
        <span
          className="transition-opacity"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          {isMaximized ? (
            <Minimize2 className="w-2 h-2 text-green-900/80" />
          ) : (
            <Maximize2 className="w-2 h-2 text-green-900/80" />
          )}
        </span>
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          className={cn(
            "absolute left-0 top-full mt-1.5 z-50",
            "w-52 rounded-xl overflow-hidden",
            "bg-card/95 backdrop-blur-xl border border-border shadow-2xl",
            "py-1 text-xs",
          )}
          onMouseEnter={openDropdown}
          onMouseLeave={scheduleClose}
        >
          {/* Move & Resize section */}
          {!isMaximized && (
            <>
              <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Move &amp; Resize
              </div>
              <div className="grid grid-cols-4 gap-1 px-2 pb-2">
                <SnapButton
                  label="Left half"
                  icon={
                    <Columns2
                      className="w-4 h-4"
                      style={{ transform: "scaleX(-1)" }}
                    />
                  }
                  onClick={() => handleAction(snapLeft)}
                />
                <SnapButton
                  label="Right half"
                  icon={<Columns2 className="w-4 h-4" />}
                  onClick={() => handleAction(snapRight)}
                />
                <SnapButton
                  label="Top half"
                  icon={
                    <Rows2
                      className="w-4 h-4"
                      style={{ transform: "scaleY(-1)" }}
                    />
                  }
                  onClick={() => handleAction(snapTop)}
                />
                <SnapButton
                  label="Bottom half"
                  icon={<Rows2 className="w-4 h-4" />}
                  onClick={() => handleAction(snapBottom)}
                />
                <SnapButton
                  label="Centre"
                  icon={<LayoutTemplate className="w-4 h-4" />}
                  onClick={() => handleAction(snapCentre)}
                  wide
                />
                <SnapButton
                  label="Fill screen"
                  icon={<RectangleHorizontal className="w-4 h-4" />}
                  onClick={() => handleAction(onToggleMaximize)}
                  wide
                />
              </div>
              <div className="border-t border-border/50 my-1" />
            </>
          )}

          {/* Full Screen */}
          <button
            type="button"
            className="flex items-center gap-2.5 w-full px-3 py-1.5 hover:bg-accent transition-colors text-foreground/80"
            onClick={() => handleAction(onToggleMaximize)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {isMaximized ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 shrink-0" /> Exit Full Screen
              </>
            ) : (
              <>
                <RectangleVertical className="w-3.5 h-3.5 shrink-0" /> Enter
                Full Screen
              </>
            )}
          </button>

          {isMaximized && (
            <button
              type="button"
              className="flex items-center gap-2.5 w-full px-3 py-1.5 hover:bg-accent transition-colors text-foreground/80"
              onClick={() => handleAction(onRestore)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              Restore window
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SnapButton ───────────────────────────────────────────────────────────────

function SnapButton({
  label,
  icon,
  onClick,
  wide,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center justify-center rounded-lg p-1.5",
        "bg-muted/60 hover:bg-accent border border-border/50",
        "transition-colors text-foreground/70",
        wide ? "col-span-2" : "col-span-1",
      )}
    >
      {icon}
    </button>
  );
}

export default WindowPanel;
