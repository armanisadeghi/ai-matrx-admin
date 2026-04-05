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
  Minus,
  Maximize2,
  Minimize2,
  X,
  RectangleHorizontal,
  RectangleVertical,
  LayoutTemplate,
  Columns2,
  Rows2,
  Grid2x2,
  AlignRight,
  AlignLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWindowPanel,
  type UseWindowPanelOptions,
  type ResizeEdge,
} from "./hooks/useWindowPanel";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  updateWindowRect,
  selectWindowsHidden,
  arrangeActiveWindows,
} from "@/lib/redux/slices/windowManagerSlice";
import { selectIsDebugMode } from "@/lib/redux/slices/adminDebugSlice";

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
  /** @deprecated Use `actionsLeft` and `actionsRight` instead */
  actions?: React.ReactNode;
  actionsLeft?: React.ReactNode;
  actionsRight?: React.ReactNode;
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
  actionsLeft,
  actionsRight,
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
    zIndex,
    onDragStart,
    onResizeStart,
    onFocus,
    onRestore,
    onMaximize,
    onMinimize,
    onToggleMaximize,
  } = useWindowPanel({ ...hookOpts, title });

  const dispatch = useAppDispatch();
  const windowsHidden = useAppSelector(selectWindowsHidden);
  const isDebugMode = useAppSelector(selectIsDebugMode);

  // ── Portal target (client-only) ──────────────────────────────────────────
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backward compat: legacy `actions` maps to actionsRight
  const resolvedActionsRight = actionsRight ?? actions ?? null;

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

  const arrangeAll = useCallback((layout: any) => {
    dispatch(
      arrangeActiveWindows({
        layout,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })
    );
  }, [dispatch]);

  const isMinimized = windowState === "minimized";
  const isMaximized = windowState === "maximized";

  // ── Header (shared across all states) ───────────────────────────────────
  const header = (
    <WindowHeader
      title={title}
      actionsLeft={actionsLeft}
      actionsRight={resolvedActionsRight}
      onDragStart={onDragStart}
      onMinimize={onMinimize}
      onToggleMaximize={onToggleMaximize}
      onClose={onClose}
      onRestore={onRestore}
      isMaximized={isMaximized}
      isMinimized={isMinimized}
      snapLeft={snapLeft}
      snapRight={snapRight}
      snapTop={snapTop}
      snapBottom={snapBottom}
      snapCentre={snapCentre}
      arrangeAll={arrangeAll}
    />
  );

  // ────────────────────────────────────────────────────────────────────────
  // MAXIMIZED — portalled to body so it covers the full viewport
  // ────────────────────────────────────────────────────────────────────────
  if (isMaximized) {
    const el = (
      <div
        className={cn(
          "fixed inset-0 flex flex-col",
          "bg-card/98 backdrop-blur-md border border-border shadow-2xl",
          "overflow-hidden",
        )}
        style={{ zIndex, visibility: windowsHidden ? "hidden" : undefined }}
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
  // WINDOWED + MINIMIZED — same shell, minimized just has a tiny rect from
  // Redux (set by minimizeWindow) so no body content is visible.
  // The body is still rendered (keeps state alive) but clipped by overflow.
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
        minWidth: isMinimized ? 0 : (minWidth ?? 180),
        minHeight: isMinimized ? 0 : (minHeight ?? 80),
        visibility: windowsHidden ? "hidden" : undefined,
      }}
      onMouseDown={onFocus}
    >
      {!isMinimized &&
        HANDLES.map((h) => (
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

      {/* Debug strip — shown in the body when open, or in the minimized shell */}
      {isDebugMode && <DebugStrip rect={rect} zIndex={zIndex} />}

      {!isMinimized && (
        <div className={cn("flex-1 overflow-auto min-h-0", bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  );

  return portalTarget ? createPortal(el, portalTarget) : null;
}

// ─── DebugStrip ───────────────────────────────────────────────────────────────

interface DebugStripProps {
  rect: { x: number; y: number; width: number; height: number };
  zIndex: number;
}

function DebugStrip({ rect, zIndex }: DebugStripProps) {
  const [vp, setVp] = useState(() =>
    typeof window === "undefined"
      ? { vw: 0, vh: 0, sw: 0, sh: 0, dpr: 1 }
      : {
          vw: window.innerWidth,
          vh: window.innerHeight,
          sw: window.screen.width,
          sh: window.screen.height,
          dpr: window.devicePixelRatio ?? 1,
        },
  );

  useEffect(() => {
    const update = () =>
      setVp({
        vw: window.innerWidth,
        vh: window.innerHeight,
        sw: window.screen.width,
        sh: window.screen.height,
        dpr: window.devicePixelRatio ?? 1,
      });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const windowEntries: [string, number][] = [
    ["x", rect.x],
    ["y", rect.y],
    ["w", rect.width],
    ["h", rect.height],
    ["z", zIndex],
  ];

  const viewportEntries: [string, number | string][] = [
    ["vw", vp.vw],
    ["vh", vp.vh],
    ["sw", vp.sw],
    ["sh", vp.sh],
    ["dpr", vp.dpr],
  ];

  return (
    <div className="flex flex-col gap-0.5 px-3 py-1.5 border-b border-amber-500/20 bg-amber-500/5 shrink-0 font-mono text-[10px]">
      {/* Row 1 — window position/size */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-amber-400/50 uppercase tracking-wide text-[9px]">
          win
        </span>
        {windowEntries.map(([label, val]) => (
          <span
            key={label}
            className="inline-flex items-center gap-0.5 leading-none"
          >
            <span className="text-amber-500/60">{label}:</span>
            <span className="text-amber-400 font-bold tabular-nums">
              {Math.round(val as number)}
            </span>
          </span>
        ))}
      </div>
      {/* Row 2 — viewport / screen */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sky-400/50 uppercase tracking-wide text-[9px]">
          vp
        </span>
        {viewportEntries.map(([label, val]) => (
          <span
            key={label}
            className="inline-flex items-center gap-0.5 leading-none"
          >
            <span className="text-sky-500/60">{label}:</span>
            <span className="text-sky-400 font-bold tabular-nums">
              {typeof val === "number" && !Number.isInteger(val)
                ? val.toFixed(2)
                : Math.round(val as number)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── WindowHeader ─────────────────────────────────────────────────────────────

interface WindowHeaderProps {
  title?: string;
  actionsLeft?: React.ReactNode;
  actionsRight?: React.ReactNode;
  onDragStart: (e: React.MouseEvent) => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onRestore: () => void;
  onClose?: () => void;
  isMaximized: boolean;
  isMinimized: boolean;
  snapLeft: () => void;
  snapRight: () => void;
  snapTop: () => void;
  snapBottom: () => void;
  snapCentre: () => void;
  arrangeAll: (layout: any) => void;
}

function WindowHeader({
  title,
  actionsLeft,
  actionsRight,
  onDragStart,
  onMinimize,
  onToggleMaximize,
  onRestore,
  onClose,
  isMaximized,
  isMinimized,
  snapLeft,
  snapRight,
  snapTop,
  snapBottom,
  snapCentre,
  arrangeAll,
}: WindowHeaderProps) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-1 px-2 py-1.5 z-20 shrink-0",
        "border-b border-border/50 bg-muted/40 select-none",
        isMaximized ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isMinimized && "border-b-0",
      )}
      onMouseDown={isMaximized ? undefined : onDragStart}
    >
      {/* Traffic-light controls */}
      <TrafficLightGroup
        isMinimized={isMinimized}
        isMaximized={isMaximized}
        onClose={onClose}
        onMinimize={onMinimize}
        onRestore={onRestore}
        onToggleMaximize={onToggleMaximize}
        snapLeft={snapLeft}
        snapRight={snapRight}
        snapTop={snapTop}
        snapBottom={snapBottom}
        snapCentre={snapCentre}
        arrangeAll={arrangeAll}
      />

      {/* Left action zone */}
      {!isMinimized && actionsLeft && (
        <div
          className="flex items-center gap-0.5 shrink-0 ml-1 text-foreground/80 [&_svg]:text-foreground/80"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {actionsLeft}
        </div>
      )}

      {/* Centered title — always visible, including when minimized */}
      <span className="text-xs font-medium text-foreground/80 flex-1 truncate text-center">
        {title ?? ""}
      </span>

      {/* Right action zone */}
      {!isMinimized && actionsRight && (
        <div
          className="flex items-center gap-0.5 shrink-0 text-foreground/80 [&_svg]:text-foreground/80"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {actionsRight}
        </div>
      )}
    </div>
  );
}

// ─── TrafficLightGroup ────────────────────────────────────────────────────────
// Hover state lives here — all three dots reveal their icons together.

interface TrafficLightGroupProps {
  isMinimized: boolean;
  isMaximized: boolean;
  onClose?: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  onToggleMaximize: () => void;
  snapLeft: () => void;
  snapRight: () => void;
  snapTop: () => void;
  snapBottom: () => void;
  snapCentre: () => void;
  arrangeAll: (layout: any) => void;
}

function TrafficLightGroup({
  isMinimized,
  isMaximized,
  onClose,
  onMinimize,
  onRestore,
  onToggleMaximize,
  snapLeft,
  snapRight,
  snapTop,
  snapBottom,
  snapCentre,
  arrangeAll,
}: TrafficLightGroupProps) {
  const [groupHovered, setGroupHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-1 shrink-0 py-2 pr-6 pl-1 -my-2 -ml-1 cursor-default"
      onMouseEnter={() => setGroupHovered(true)}
      onMouseLeave={() => setGroupHovered(false)}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Red — Close */}
      <TrafficLight
        color="red"
        showIcon={groupHovered}
        icon={
          <X className="w-[8px] h-[8px] stroke-[3]" style={{ color: "#7f1d1d" }} />
        }
        onClick={onClose ?? undefined}
        disabled={!onClose}
        aria-label="Close"
      />

      {/* Yellow — Minimize / restore */}
      <TrafficLight
        color="yellow"
        showIcon={groupHovered}
        icon={
          isMinimized ? (
            <Maximize2
              className="w-[8px] h-[8px] stroke-[3]"
              style={{ color: "#713f12" }}
            />
          ) : (
            <Minus
              className="w-[8px] h-[8px] stroke-[3]"
              style={{ color: "#713f12" }}
            />
          )
        }
        onClick={isMinimized ? onRestore : onMinimize}
        aria-label={isMinimized ? "Restore" : "Minimize"}
      />

      {/* Green — Maximize / dropdown */}
      <GreenTrafficLight
        showIcon={groupHovered}
        isMaximized={isMaximized}
        onToggleMaximize={onToggleMaximize}
        onRestore={onRestore}
        snapLeft={snapLeft}
        snapRight={snapRight}
        snapTop={snapTop}
        snapBottom={snapBottom}
        snapCentre={snapCentre}
        arrangeAll={arrangeAll}
      />
    </div>
  );
}

// ─── TrafficLight (red / yellow) ─────────────────────────────────────────────

interface TrafficLightProps {
  color: "red" | "yellow";
  icon: React.ReactNode;
  showIcon: boolean;
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}

function TrafficLight({
  color,
  icon,
  showIcon,
  onClick,
  disabled,
  "aria-label": label,
}: TrafficLightProps) {
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
      onMouseDown={(e) => e.stopPropagation()}
      aria-label={label}
      disabled={disabled}
    >
      <span
        className="transition-opacity duration-100"
        style={{ opacity: showIcon && !disabled ? 1 : 0 }}
      >
        {icon}
      </span>
    </button>
  );
}

// ─── GreenTrafficLight (with dropdown) ───────────────────────────────────────

interface GreenTrafficLightProps {
  showIcon: boolean;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onRestore: () => void;
  snapLeft: () => void;
  snapRight: () => void;
  snapTop: () => void;
  snapBottom: () => void;
  snapCentre: () => void;
  arrangeAll: (layout: any) => void;
}

function GreenTrafficLight({
  showIcon,
  isMaximized,
  onToggleMaximize,
  onRestore,
  snapLeft,
  snapRight,
  snapTop,
  snapBottom,
  snapCentre,
  arrangeAll,
}: GreenTrafficLightProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openDropdown = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setDropdownOpen(true);
  };
  const scheduleClose = () => {
    leaveTimer.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 120);
  };

  const handleAction = (fn: () => void) => {
    setDropdownOpen(false);
    fn();
  };

  return (
    <div
      className="relative"
      onMouseEnter={openDropdown}
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
          className="transition-opacity duration-100 flex items-center justify-center relative w-full h-full"
          style={{ opacity: showIcon ? 1 : 0 }}
        >
          {isMaximized ? (
            <Minimize2
              className="w-[8px] h-[8px] stroke-[3] absolute"
              style={{ color: "#14532d" }}
            />
          ) : (
            <Maximize2
              className="w-[8px] h-[8px] stroke-[3] absolute"
              style={{ color: "#14532d" }}
            />
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

              <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Arrange All
              </div>
              <div className="grid grid-cols-4 gap-1 px-2 pb-2">
                <SnapButton
                  label="Grid 4"
                  icon={<Grid2x2 className="w-4 h-4" />}
                  onClick={() => handleAction(() => arrangeAll("grid4"))}
                />
                <SnapButton
                  label="Grid 6"
                  icon={<Grid2x2 className="w-4 h-4" />}
                  onClick={() => handleAction(() => arrangeAll("grid6"))}
                />
                <SnapButton
                  label="Grid 8"
                  icon={<Grid2x2 className="w-4 h-4" />}
                  onClick={() => handleAction(() => arrangeAll("grid8"))}
                />
                <SnapButton
                  label="Stack Right"
                  icon={<AlignRight className="w-4 h-4" />}
                  onClick={() => handleAction(() => arrangeAll("stackRight2"))}
                />
                <SnapButton
                  label="Stack Left"
                  icon={<AlignLeft className="w-4 h-4" />}
                  onClick={() => handleAction(() => arrangeAll("stackLeft2"))}
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
