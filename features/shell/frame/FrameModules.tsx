"use client";

// THE FRAME'S HEAVY MODULES (owner, 2026-10-20): the side chat and the canvas are
// OWNED by the frame and are available on every page, but neither loads nor renders
// until the person engages it. The page passes a loader; the frame calls it on first
// engagement only, renders it through React.lazy inside Suspense, and shows a quiet
// skeleton (never a spinner) while the chunk arrives. Also here: the side chat's resize
// handle and the page's featherweight ask bar.
import { Component, Suspense, createElement, lazy, useMemo, useState } from "react";
import type { ComponentType, KeyboardEvent, LazyExoticComponent, PointerEvent, ReactNode } from "react";
import { ArrowUp, Mic, Shapes, Webhook, X } from "lucide-react";
import { holdDragCursor } from "@ai-matrx/design-system";
import { cn } from "@ai-matrx/design-system/cn";
import { Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import type { FrameModuleLoader } from "./types";

// One lazy component per loader, for the page's lifetime: React.lazy calls the loader the
// first time the component renders, and never again.
// Keyed by the loader, so the value's type is the loader's own (P is fixed per loader).
const LAZY = new WeakMap<object, unknown>();

export function lazyModule<P>(loader: FrameModuleLoader<P>): LazyExoticComponent<ComponentType<P>> {
  const found = LAZY.get(loader) as LazyExoticComponent<ComponentType<P>> | undefined;
  if (found) return found;
  const made = lazy(loader);
  LAZY.set(loader, made);
  return made;
}

/**
 * A panel's own title row, shared by the stand-ins, the skeleton and the canvas. No bottom rule
 * (headers have none, owner 2026-09-27). `header` height lines up with the sheet's header row.
 */
export function PanelTitle({ icon, title, onClose, closeLabel, tools, height = "tabs" }: {
  icon: ReactNode;
  title: string;
  onClose?: () => void;
  closeLabel: string;
  tools?: ReactNode;
  height?: "tabs" | "header";
}) {
  return (
    <div
      className={
        height === "header"
          ? "flex h-[var(--matrx-frame-header-h)] shrink-0 items-center gap-2 pr-2 pl-3"
          : "flex h-[var(--matrx-frame-tabs-h)] shrink-0 items-center gap-2 pr-1 pl-3"
      }
    >
      <span className="flex size-4 items-center text-muted-foreground [&_svg]:size-4" aria-hidden>
        {icon}
      </span>
      <span className="type-title flex-1 truncate">{title}</span>
      {tools}
      {onClose ? <Button variant="quiet" icon={<X />} aria-label={closeLabel} onClick={onClose} /> : null}
    </div>
  );
}

class ModuleBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    // A module that failed to load says so: the panel shows the failure, the console carries the cause.
    console.error("[app-frame] a frame module failed to load", error);
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Renders a loaded module, its skeleton while the chunk arrives, or an honest failure. */
export function ModuleSlot<P extends object>({
  loader,
  props,
  title,
  icon,
  onClose,
  bare,
}: {
  loader: FrameModuleLoader<P>;
  props: P;
  title: string;
  icon: ReactNode;
  onClose?: () => void;
  /** The frame draws this panel's title row itself (the canvas): no title in the skeleton or failure. */
  bare?: boolean;
}) {
  const Loaded = useMemo(() => lazyModule(loader), [loader]);
  const closeLabel = `Close ${title.toLowerCase()}`;
  const titleRow = bare ? null : <PanelTitle icon={icon} title={title} onClose={onClose} closeLabel={closeLabel} />;
  return (
    <ModuleBoundary
      fallback={
        <div className="flex h-full min-h-0 flex-col">
          {titleRow}
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <EmptyState icon={icon} title={`${title} did not load`} line="Close it and open it again" />
          </div>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="flex h-full min-h-0 flex-col" aria-busy="true">
            {titleRow}
            <div className="p-3">
              <RegionSkeleton shape="rows" count={4} twoLine aria-label={`Loading ${title.toLowerCase()}`} />
            </div>
          </div>
        }
      >
        {createElement(Loaded, props)}
      </Suspense>
    </ModuleBoundary>
  );
}

/** STAND-IN: the side chat, when the host passes no loader. */
export function CompanionPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelTitle icon={<Webhook />} title="Side chat" onClose={onClose} closeLabel="Close side chat" />
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <EmptyState icon={<Webhook />} title="Side chat placeholder" line="The agent chat will sit here" />
      </div>
    </div>
  );
}

/** STAND-IN: the canvas body, when the host passes no loader (the frame draws its title row). */
export function CanvasPlaceholder() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-4">
      <EmptyState icon={<Shapes />} title="Canvas placeholder" line="The canvas will sit here" />
    </div>
  );
}

/**
 * The side chat's left-edge resize handle: drag, or focus it and use the arrow keys.
 * While dragging the frame turns its panel motion off (no motion while dragging). Dragging
 * past `snapBelow` snaps the panel shut on release (owner, 2026-09-27).
 */
export function PanelResizeHandle({
  label,
  width,
  min,
  max,
  snapBelow,
  edge = "left",
  onResize,
  onDragChange,
  onCommit,
  onSnapClose,
}: {
  label: string;
  width: number;
  min: number;
  max: number;
  snapBelow: number;
  /** Which edge of its panel the handle sits on: `left` (the side chat) or `right` (the sidebar). */
  edge?: "left" | "right";
  onResize: (width: number) => void;
  onDragChange: (dragging: boolean) => void;
  onCommit: (width: number) => void;
  onSnapClose: () => void;
}) {
  const clamp = (w: number) => Math.round(Math.min(max, Math.max(min, w)));

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startW = width;
    let last = startW;
    let raw = startW;
    const release = holdDragCursor("col-resize");
    onDragChange(true);
    const move = (ev: globalThis.PointerEvent) => {
      // The handle sits on the panel's LEFT edge: moving left widens the panel.
      // On a LEFT edge moving left widens the panel; on a RIGHT edge moving right does.
      raw = startW + (edge === "left" ? startX - ev.clientX : ev.clientX - startX);
      last = clamp(raw);
      onResize(last);
    };
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      release();
      onDragChange(false);
      if (raw < snapBelow) {
        // Snapped shut: the remembered width stays what it was before this drag.
        onResize(startW);
        onSnapClose();
      } else onCommit(last);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 64 : 16;
    let next: number | null = null;
    const grow = edge === "left" ? "ArrowLeft" : "ArrowRight";
    const shrink = edge === "left" ? "ArrowRight" : "ArrowLeft";
    if (e.key === grow) next = clamp(width + step);
    else if (e.key === shrink) next = clamp(width - step);
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    if (next === null) return;
    e.preventDefault();
    onResize(next);
    onCommit(next);
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      data-edge={edge}
      className={cn(
        "mf-resize-handle absolute inset-y-0 z-10 w-2 touch-none outline-none",
        edge === "left" ? "-left-1" : "-right-1",
      )}
    />
  );
}

/**
 * THE ASK BAR — a page's faint chat input (the notes page). Text, mic and send, nothing else
 * (owner, 2026-10-05: no agents, models or tools here; the page is always the context). It is
 * a plain input: no chat module, no agent, no network. Send or mic hands the text to the
 * frame, which opens the side chat and gives it the text once that module has loaded. It sits
 * in flow under the body, so it never covers the page's last line.
 */
export function AskBar({ onSend }: { onSend: (text: string, dictate: boolean) => void }) {
  const [text, setText] = useState("");
  const ready = text.trim().length > 0;
  return (
    <form
      data-mf-owner="frame"
      data-mf-region="ask-bar"
      className="shrink-0 px-[var(--matrx-frame-gutter)] pt-1 pb-3"
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t) return;
        onSend(t, false);
        setText("");
      }}
    >
      <div className="mf-ask mx-auto flex w-full max-w-3xl items-center gap-1 pr-1 pl-3">
        {/* ui-exception: the ask bar is featherweight by the owner's rule (2026-10-20); the real writing box is the side chat it opens */}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Ask about this page"
          placeholder="Ask about this page"
          className="mf-ask-input h-9 min-w-0 flex-1 bg-transparent outline-none"
        />
        <Button
          variant="quiet"
          icon={<Mic />}
          aria-label="Dictate"
          onClick={() => {
            onSend(text.trim(), true);
            setText("");
          }}
        />
        <Button variant="quiet" icon={<ArrowUp />} aria-label="Send to side chat" type="submit" disabled={!ready} />
      </div>
    </form>
  );
}
