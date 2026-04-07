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
import type { PanelImperativeHandle } from "react-resizable-panels";
import {
  Minus,
  Maximize2,
  Minimize2,
  X,
  RectangleVertical,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  LayoutIcon,
  LayoutIconButton,
  type LayoutIconType,
} from "./components/LayoutIcon";
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
import { useUrlSync } from "./url-sync/useUrlSync";

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
  urlSyncKey?: string;
  urlSyncId?: string;
  urlSyncArgs?: Record<string, string>;
  /** Content to render in a collapsible left sidebar panel */
  sidebar?: React.ReactNode;
  /** Default percentage width for the sidebar (default: 25) */
  sidebarDefaultSize?: number;
  /** Minimum percentage width before the sidebar collapses (default: 10) */
  sidebarMinSize?: number;
  /** Whether the sidebar starts open (default: true) */
  defaultSidebarOpen?: boolean;
  /** Class name applied to the sidebar panel content wrapper */
  sidebarClassName?: string;
  /** Content rendered in a full-width footer bar below the body. Renders as a single flex row. For zoned layout, use footerLeft/footerCenter/footerRight instead. */
  footer?: React.ReactNode;
  /** Left-aligned footer content (use instead of `footer` for zoned layout) */
  footerLeft?: React.ReactNode;
  /** Center-aligned footer content */
  footerCenter?: React.ReactNode;
  /** Right-aligned footer content */
  footerRight?: React.ReactNode;
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
  urlSyncKey,
  urlSyncId,
  urlSyncArgs,
  sidebar,
  sidebarDefaultSize = 25,
  sidebarMinSize = 10,
  defaultSidebarOpen = true,
  sidebarClassName,
  footer,
  footerLeft,
  footerCenter,
  footerRight,
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

  useUrlSync(urlSyncKey, urlSyncId, urlSyncArgs);

  // ── Sidebar state ─────────────────────────────────────────────────────────
  const hasSidebar = !!sidebar;
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const sidebarPanelRef = useRef<PanelImperativeHandle>(null);

  useEffect(() => {
    if (!defaultSidebarOpen) {
      sidebarPanelRef.current?.collapse();
    }
  }, [defaultSidebarOpen]);

  const toggleSidebar = useCallback(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (sidebarOpen) {
      panel.collapse();
    } else {
      panel.expand();
    }
  }, [sidebarOpen]);

  const handleSidebarResize = useCallback(
    (panelSize: { asPercentage: number; inPixels: number }) => {
      setSidebarOpen(panelSize.asPercentage > 0);
    },
    [],
  );

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

  const arrangeAll = useCallback(
    (layout: any) => {
      dispatch(
        arrangeActiveWindows({
          layout,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        }),
      );
    },
    [dispatch],
  );

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
      hasSidebar={hasSidebar}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={toggleSidebar}
    />
  );

  // ────────────────────────────────────────────────────────────────────────
  // MAXIMIZED — portalled to body so it covers the full viewport
  // ────────────────────────────────────────────────────────────────────────
  const bodyContent = hasSidebar ? (
    <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
      <ResizablePanel
        panelRef={sidebarPanelRef}
        defaultSize={sidebarOpen ? sidebarDefaultSize : 0}
        minSize={sidebarMinSize}
        collapsible
        collapsedSize={0}
        onResize={handleSidebarResize}
        style={{ overflow: "hidden" }}
      >
        <div
          className={cn(
            "h-full flex flex-col min-h-0 overflow-y-auto scrollbar-thin",
            sidebarClassName,
          )}
        >
          {sidebar}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        defaultSize={sidebarOpen ? 100 - sidebarDefaultSize : 100}
        minSize={40}
      >
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  ) : (
    children
  );

  const hasZonedFooter = footerLeft || footerCenter || footerRight;
  const hasFooter = footer || hasZonedFooter;

  const footerBar = hasFooter ? (
    <div
      className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-t border-border/50 bg-muted/40 select-none text-xs [&_svg]:h-3 [&_svg]:w-3 [&_button]:h-5 [&_button]:text-xs"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {footer ?? (
        <>
          <div className="flex items-center gap-1 shrink-0">{footerLeft}</div>
          <div className="flex-1 flex items-center justify-center gap-1">
            {footerCenter}
          </div>
          <div className="flex items-center gap-1 shrink-0">{footerRight}</div>
        </>
      )}
    </div>
  ) : null;

  if (isMaximized) {
    const el = (
      <div
        className={cn(
          "fixed inset-0 flex flex-col",
          "bg-card/98 backdrop-blur-md border border-border shadow-2xl",
          "overflow-hidden",
          className,
        )}
        style={{ zIndex, visibility: windowsHidden ? "hidden" : undefined }}
        onMouseDown={onFocus}
      >
        {header}
        <div className={cn("flex-1 overflow-auto", bodyClassName)}>
          {bodyContent}
        </div>
        {footerBar}
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
          {bodyContent}
        </div>
      )}
      {!isMinimized && footerBar}
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
  hasSidebar: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
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
  hasSidebar,
  sidebarOpen,
  onToggleSidebar,
}: WindowHeaderProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-1 px-2 py-1.5 min-h-[26px] z-20 shrink-0",
        "border-b border-border/50 bg-muted/40 select-none",
        isMaximized ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isMinimized && "border-b-0",
      )}
      onMouseDown={isMaximized ? undefined : onDragStart}
    >
      {/* macOS-style hot zone: absolutely positioned to cover the full
          left side of the header (top-to-bottom, no padding). The traffic
          lights and sidebar toggle live inside it so CSS group-hover/tl
          reveals all icons when the cursor enters the zone. */}
      <div
        className={cn(
          "group/tl absolute top-0 left-0 bottom-0 flex items-center z-20",
          hasSidebar ? "w-28" : "w-24",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="pl-2">
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
            hasSidebar={hasSidebar}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={onToggleSidebar}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 z-10 shrink-0">
        {/* Spacer matching the hot zone width so left actions don't overlap */}
        <div className={hasSidebar ? "w-28" : "w-24"} />

        {/* Left action zone */}
        {!isMinimized && actionsLeft && (
          <div
            className="flex items-center gap-0.5 shrink-0 text-foreground/80 [&_svg]:text-foreground/80"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {actionsLeft}
          </div>
        )}
      </div>

      {/* Absolute Centered title — always visible, including when minimized */}
      <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs font-medium text-foreground/80 truncate px-16">
          {title ?? ""}
        </span>
      </div>

      {/* Right action zone */}
      <div className="flex items-center gap-1 z-10 shrink-0">
        {!isMinimized && actionsRight && (
          <div
            className="flex items-center gap-0.5 shrink-0 text-foreground/80 [&_svg]:text-foreground/80"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {actionsRight}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TrafficLightGroup ────────────────────────────────────────────────────────
// Nested inside the group/tl hot zone — icon reveal uses CSS group-hover/tl.

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
  hasSidebar: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
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
  hasSidebar,
  sidebarOpen,
  onToggleSidebar,
}: TrafficLightGroupProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0 cursor-default">
      {/* Red — Close */}
      <TrafficLight
        color="red"
        icon={
          <X className="w-2 h-2 stroke-[3.5]" style={{ color: "#000000" }} />
        }
        onClick={onClose ?? undefined}
        disabled={!onClose}
        aria-label="Close"
      />

      {/* Yellow — Minimize / restore */}
      <TrafficLight
        color="yellow"
        icon={
          isMinimized ? (
            <Maximize2
              className="w-2 h-2 stroke-[3.5]"
              style={{ color: "#000000" }}
            />
          ) : (
            <Minus
              className="w-2 h-2 stroke-[3.5]"
              style={{ color: "#000000" }}
            />
          )
        }
        onClick={isMinimized ? onRestore : onMinimize}
        aria-label={isMinimized ? "Restore" : "Minimize"}
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
        arrangeAll={arrangeAll}
      />

      {/* Sidebar toggle — sits tight next to the traffic lights */}
      {hasSidebar && !isMinimized && (
        <button
          type="button"
          className="ml-0.5 p-0.5 rounded hover:bg-accent/60 transition-colors text-foreground/60 group-hover/tl:text-foreground"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-3.5 h-3.5" />
          ) : (
            <PanelLeft className="w-3.5 h-3.5" />
          )}
        </button>
      )}
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
  const base =
    "w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors shrink-0 relative";
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
        className={cn(
          "opacity-0 transition-opacity duration-100",
          !disabled && "group-hover/tl:opacity-100",
        )}
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
  arrangeAll: (layout: any) => void;
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
          "w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors shrink-0",
          "bg-green-500 hover:bg-green-400 cursor-pointer",
        )}
        onClick={() => handleAction(onToggleMaximize)}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label={isMaximized ? "Restore" : "Maximize"}
      >
        <span className="opacity-0 group-hover/tl:opacity-100 transition-opacity duration-100 flex items-center justify-center relative w-full h-full">
          {isMaximized ? (
            <Minimize2
              className="w-2 h-2 stroke-[3.5] absolute"
              style={{ color: "#000000" }}
            />
          ) : (
            <Maximize2
              className="w-2 h-2 stroke-[3.5] absolute"
              style={{ color: "#000000" }}
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
              <div className="flex flex-col gap-1 px-2 pb-2">
                <div className="flex gap-1 justify-center">
                  <LayoutIconButton
                    onClick={() => handleAction(snapLeft)}
                    type="left-half"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(snapRight)}
                    type="right-half"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(snapTop)}
                    type="top-half"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(snapBottom)}
                    type="bottom-half"
                  />
                </div>
                <div className="flex gap-1 justify-center">
                  <LayoutIconButton
                    onClick={() => handleAction(snapCentre)}
                    type="centre"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(onToggleMaximize)}
                    type="full"
                  />
                </div>
              </div>
              <div className="border-t border-border/50 my-1" />

              <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Arrange All
              </div>
              <div className="flex flex-col gap-1 px-2 pb-2">
                <div className="flex gap-1 justify-center">
                  <LayoutIconButton
                    onClick={() => handleAction(() => arrangeAll("grid4"))}
                    type="grid4"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(() => arrangeAll("grid6"))}
                    type="grid6"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(() => arrangeAll("grid8"))}
                    type="grid8"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(() => arrangeAll("grid9"))}
                    type="grid9"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(() => arrangeAll("grid12"))}
                    type="grid12"
                  />
                </div>
                <div className="flex gap-1 justify-center">
                  <LayoutIconButton
                    onClick={() =>
                      handleAction(() => arrangeAll("stackRight2"))
                    }
                    type="stackRight2"
                  />
                  <LayoutIconButton
                    onClick={() =>
                      handleAction(() => arrangeAll("stackRight3"))
                    }
                    type="stackRight3"
                  />
                  <LayoutIconButton
                    onClick={() =>
                      handleAction(() => arrangeAll("stackRight4"))
                    }
                    type="stackRight4"
                  />
                  <LayoutIconButton
                    onClick={() =>
                      handleAction(() => arrangeAll("stackRight5"))
                    }
                    type="stackRight5"
                  />
                </div>
                <div className="flex gap-1 justify-center">
                  <LayoutIconButton
                    onClick={() => handleAction(() => arrangeAll("stackLeft2"))}
                    type="stackLeft2"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(() => arrangeAll("stackLeft3"))}
                    type="stackLeft3"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(() => arrangeAll("stackLeft4"))}
                    type="stackLeft4"
                  />
                  <LayoutIconButton
                    onClick={() => handleAction(() => arrangeAll("stackLeft5"))}
                    type="stackLeft5"
                  />
                </div>
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
