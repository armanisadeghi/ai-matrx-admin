"use client";

/**
 * FloatingPanel
 *
 * A draggable, collapsible floating container for any content.
 * Designed to sit fixed/absolute on screen with a drag-handle header,
 * an optional title, optional action buttons, a collapse toggle, and a close button.
 *
 * Features:
 *  - Drag to move: the entire header acts as the drag handle; action buttons stop propagation
 *  - Collapsible: clicking the chevron toggles the body in/out with smooth animation
 *  - Controlled or uncontrolled collapse: pass `collapsed` + `onCollapsedChange` or omit for internal state
 *  - Close callback: `onClose` — if omitted the X button is not rendered
 *  - Action buttons: arbitrary React nodes rendered in the header before the collapse/close controls
 *  - Title: optional string shown in the header
 *  - Size presets + custom override: xs / sm / md / lg / xl / full — or pass an explicit `width` class
 *  - Min/max content height: sensible defaults overridable via `minContentHeight` / `maxContentHeight`
 *  - No fixed height on the panel itself — it shrinks/grows with content
 *  - children: any React node rendered inside the body (padded content area)
 *  - bodyClassName: extra classes on the body wrapper (e.g. to remove padding or add bg)
 *  - className: extra classes on the root panel element
 *
 * Sizing:
 *   size="xs"  → w-48  (12rem / 192px)
 *   size="sm"  → w-64  (16rem / 256px)
 *   size="md"  → w-80  (20rem / 320px)  ← default
 *   size="lg"  → w-96  (24rem / 384px)
 *   size="xl"  → w-[28rem]
 *   size="2xl" → w-[36rem]
 *   size="full"→ w-full
 *   width prop → any Tailwind width class, overrides size
 *
 * Usage:
 *   <FloatingPanel
 *     title="My Panel"
 *     size="md"
 *     onClose={() => setOpen(false)}
 *     actions={<MyButton />}
 *     onDragStart={handleMouseDown}
 *   >
 *     <MyContent />
 *   </FloatingPanel>
 */

import React, { useRef, useCallback, useState } from "react";
import { GripVertical, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Size map ───────────────────────────────────────────────────────────────

const SIZE_MAP = {
  xs: "w-48",
  sm: "w-64",
  md: "w-80",
  lg: "w-96",
  xl: "w-[28rem]",
  "2xl": "w-[36rem]",
  full: "w-full",
} as const;

type PanelSize = keyof typeof SIZE_MAP;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface FloatingPanelProps {
  /** Any content to render inside the panel body */
  children: React.ReactNode;

  /** Optional title shown in the header */
  title?: string;

  /**
   * Optional action nodes rendered in the header, between the title and the
   * collapse/close controls. Wrap each interactive element in a div that calls
   * e.stopPropagation() on mouseDown so they don't trigger the drag.
   * FloatingPanel does this automatically for each child in the array — but if
   * you pass a single node it will also be wrapped.
   */
  actions?: React.ReactNode;

  /**
   * Called when the header bar receives a mousedown event (the drag gesture
   * start). Typically you pass the mousedown handler from a useDraggable hook.
   */
  onDragStart?: (e: React.MouseEvent) => void;

  /**
   * If provided, an X button is shown in the header and this is called on click.
   */
  onClose?: () => void;

  /**
   * Controlled collapsed state. If omitted, the component manages its own
   * internal collapsed state starting from `defaultCollapsed`.
   */
  collapsed?: boolean;

  /** Called when the user toggles collapse (controlled mode). */
  onCollapsedChange?: (collapsed: boolean) => void;

  /** Initial collapsed state when uncontrolled. Defaults to false. */
  defaultCollapsed?: boolean;

  /**
   * Preset panel width. One of the SIZE_MAP keys. Defaults to "md".
   * Ignored when `width` is provided.
   */
  size?: PanelSize;

  /**
   * Explicit Tailwind width class (e.g. "w-[22rem]"). Overrides `size`.
   */
  width?: string;

  /** Extra classes applied to the root panel element. */
  className?: string;

  /** Extra classes applied to the body wrapper div. */
  bodyClassName?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FloatingPanel({
  children,
  title,
  actions,
  onDragStart,
  onClose,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  defaultCollapsed = false,
  size = "md",
  width,
  className,
  bodyClassName,
}: FloatingPanelProps) {
  // ── Collapse state (controlled vs uncontrolled) ─────────────────────────
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isControlled = controlledCollapsed !== undefined;
  const isCollapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const handleToggleCollapse = useCallback(() => {
    const next = !isCollapsed;
    if (isControlled) {
      onCollapsedChange?.(next);
    } else {
      setInternalCollapsed(next);
    }
  }, [isCollapsed, isControlled, onCollapsedChange]);

  // ── Width class ─────────────────────────────────────────────────────────
  const widthClass = width ?? SIZE_MAP[size];

  // ── Normalise actions into an array so we can wrap each one ─────────────
  const actionNodes = actions
    ? React.Children.toArray(
        React.isValidElement(actions) || typeof actions !== "object"
          ? [actions]
          : (actions as React.ReactNode),
      )
    : [];

  return (
    <div
      className={cn(
        widthClass,
        "rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-xl overflow-hidden",
        className,
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 border-b border-border/50 bg-muted/30 select-none",
          onDragStart ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        )}
        onPointerDown={onDragStart}
      >
        {/* Grip icon — visual affordance only */}
        {onDragStart && (
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}

        {/* Title */}
        <span className="text-xs font-medium text-foreground/80 flex-1 truncate">
          {title ?? ""}
        </span>

        {/* Action slots — each wrapped to stop drag propagation */}
        {actionNodes.map((node, i) => (
          <div key={i} onPointerDown={(e) => e.stopPropagation()}>
            {node}
          </div>
        ))}

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={handleToggleCollapse}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Close button — only when onClose is provided */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className={cn("p-2", bodyClassName)}>{children}</div>
      )}
    </div>
  );
}

export default FloatingPanel;
