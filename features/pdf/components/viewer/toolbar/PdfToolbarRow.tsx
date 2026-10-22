"use client";

/**
 * THE PDF toolbar row — one component for every layout and every host.
 *
 * Drawn FROM the fold plan (./toolbar-plan.ts): fixed-size parts measured
 * against the viewer's width, so the row fits at any width and every control
 * sits in exactly one place, row or `···` menu. Both layouts compose it: the
 * paged renderer (page = the shown page) and the continuous layout / any
 * stacked-document host (page from scroll position, `onPage` scrolls). The
 * row never knows which: zoom, fit, rotate and the pager arrive as props.
 * Guard: toolbar-plan.test.ts (sizes only from TOOLBAR_METRICS).
 */

import { useCallback, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Maximize2,
  Minus,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RotateCw,
  Scaling,
} from "lucide-react";
import { useMediaQueryState } from "@ai-matrx/kit/media-query";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { cn } from "@/lib/utils";
import { TooltipIcon } from "@/features/files/components/core/Tooltip/TooltipIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { planPdfToolbar, TOOLBAR_METRICS, type PdfToolbarControl } from "./toolbar-plan";

/**
 * Every size in the toolbar row comes from TOOLBAR_METRICS / the plan — the
 * same numbers the fold plan measures with — never a Tailwind size class
 * (guard: toolbar-plan.test.ts reads this file).
 */
const ITEM_GROUP_STYLE = { columnGap: TOOLBAR_METRICS.itemGap } as const;
const SEPARATOR_STYLE = {
  width: 1,
  height: 16,
  marginInline: (TOOLBAR_METRICS.separator - 1) / 2,
} as const;

/**
 * The host's docked chrome folded behind ONE trigger (`plan.host`): the same
 * nodes the host handed in, in a small popover, so nothing is ever clipped
 * off the row. Sizes come from the plan (the trigger is one target).
 */
function HostFold({
  nodes,
  label,
  className,
  style,
}: {
  nodes: React.ReactNode;
  label: string;
  className: string;
  style: React.CSSProperties;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className={className} style={style}>
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        style={{ width: "auto", maxWidth: "calc(100vw - 16px)", padding: 4 }}
      >
        <div className="flex items-center" style={{ ...ITEM_GROUP_STYLE, flexWrap: "wrap" }}>
          {nodes}
        </div>
      </PopoverContent>
    </Popover>
  );
}


/** Every toolbar icon button shares this; its square size comes from the plan. */
const TOOL_BUTTON_BASE =
  "flex shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40";


/** Live border-box width of a small element (docked toolbar chrome). */
function useBoxWidth(): [number, (node: HTMLDivElement | null) => void] {
  const [width, setWidth] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!node) return;
    // offsetWidth is the LAYOUT width — getBoundingClientRect() is scaled by
    // any ancestor transform (a Board tile animating into focus measured the
    // host's controls at 70% and the plan kept that number for good).
    const measure = () => setWidth(node.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    roRef.current = ro;
  }, []);
  return [width, ref];
}

export type PdfZoomMode = "fit" | "fit-width" | "actual" | "scale";

/** What the row needs to draw and drive the zoom controls. */
export interface PdfToolbarZoom {
  /** "Fit 75%" / "150%" — the label between the steppers. */
  label: string;
  mode: PdfZoomMode;
  canIn: boolean;
  canOut: boolean;
  /** One stepper press: +1 zoom in, -1 zoom out. */
  step(direction: 1 | -1): void;
  /** Fit page / fit width / actual size. */
  setMode(mode: Exclude<PdfZoomMode, "scale">): void;
}

export interface PdfToolbarRowProps {
  /** The viewer's measured width in CSS px (0 = not measured yet). */
  width: number;
  zoom: PdfToolbarZoom;
  /** Current page (1-based) and page count. */
  page: number;
  pages: number;
  onPage(page: number): void;
  /** Show the pager at all (default true). */
  pageNav?: boolean;
  /** Rotate 90 degrees; the control is absent when omitted. */
  onRotate?: () => void;
  /** Controls this layout does not have (a scrolling stack has no fit-page / actual size). */
  omit?: PdfToolbarControl[];
  pageLabel?: string;
  toolbarStart?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
}

export function PdfToolbarRow({
  width,
  zoom,
  page,
  pages,
  onPage,
  pageNav = true,
  onRotate,
  omit,
  pageLabel = "page",
  toolbarStart,
  toolbarEnd,
}: PdfToolbarRowProps) {
  // Touch vs mouse sets the target size (never the window width), and docked
  // host chrome is measured so the plan sees it.
  const coarsePointer = useMediaQueryState("(pointer: coarse)") ?? false;
  const [startWidth, startRef] = useBoxWidth();
  const [endWidth, endRef] = useBoxWidth();
  const plan = planPdfToolbar({
    width,
    coarse: coarsePointer,
    pages,
    pageNav,
    startWidth: toolbarStart ? startWidth : 0,
    endWidth: toolbarEnd ? endWidth : 0,
    omit: onRotate ? omit : [...(omit ?? []), "rotate"],
  });
  const toolButton = TOOL_BUTTON_BASE;
  const buttonStyle = { width: plan.target, height: plan.target };
  const pageLabelTitle =
    pageLabel.length > 0 ? `${pageLabel[0]?.toUpperCase()}${pageLabel.slice(1)}` : "Page";

  return (
    <div
      className="flex min-w-0 shrink-0 items-center justify-between overflow-hidden border-b border-border/60 bg-background/80 text-xs"
      style={{
        minHeight: Math.max(40, plan.target + 1),
        columnGap: TOOLBAR_METRICS.groupGap,
        paddingInline: TOOLBAR_METRICS.padding / 2,
      }}
    >
      <div className="flex shrink-0 items-center" style={ITEM_GROUP_STYLE}>
        {plan.host === "all-folded" && (toolbarStart || toolbarEnd) ? (
          <>
            <HostFold
              label="File controls"
              nodes={
                <>
                  {toolbarStart}
                  {toolbarEnd}
                </>
              }
              className={toolButton}
              style={buttonStyle}
            />
            <span aria-hidden className="shrink-0 bg-border" style={SEPARATOR_STYLE} />
          </>
        ) : toolbarStart ? (
          <>
            <div ref={startRef} className="flex shrink-0 items-center" style={ITEM_GROUP_STYLE}>
              {toolbarStart}
            </div>
            <span aria-hidden className="shrink-0 bg-border" style={SEPARATOR_STYLE} />
          </>
        ) : null}
        {plan.row.includes("zoom") ? (
          <>
            <TooltipIcon label="Zoom out">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => zoom.step(-1)}
                disabled={!zoom.canOut}
                className={toolButton}
                style={buttonStyle}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </TooltipIcon>
            <span
              className="shrink-0 text-center text-xs font-medium tabular-nums"
              style={{ width: TOOLBAR_METRICS.zoomLabel }}
            >
              {zoom.label}
            </span>
            <TooltipIcon label="Zoom in">
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => zoom.step(1)}
                disabled={!zoom.canIn}
                className={toolButton}
                style={buttonStyle}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </TooltipIcon>
            {plan.row.length > 1 || plan.showMore ? (
              <span aria-hidden className="shrink-0 bg-border" style={SEPARATOR_STYLE} />
            ) : null}
          </>
        ) : null}
        {plan.row.includes("fitPage") ? (
          <TooltipIcon label="Fit page (default)">
            <button
              type="button"
              aria-label="Fit page"
              aria-pressed={zoom.mode === "fit"}
              onClick={() => zoom.setMode("fit")}
              style={buttonStyle}
              className={cn(toolButton, zoom.mode === "fit" && "bg-accent text-accent-foreground")}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </TooltipIcon>
        ) : null}
        {plan.row.includes("fitWidth") ? (
          <TooltipIcon label="Fit width">
            <button
              type="button"
              aria-label="Fit width"
              aria-pressed={zoom.mode === "fit-width"}
              onClick={() => zoom.setMode("fit-width")}
              style={buttonStyle}
              className={cn(toolButton, zoom.mode === "fit-width" && "bg-accent text-accent-foreground")}
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </TooltipIcon>
        ) : null}
        {plan.row.includes("actual") ? (
          <TooltipIcon label="Actual size (100%)">
            <button
              type="button"
              aria-label="Actual size"
              aria-pressed={zoom.mode === "actual"}
              onClick={() => zoom.setMode("actual")}
              style={buttonStyle}
              className={cn(toolButton, zoom.mode === "actual" && "bg-accent text-accent-foreground")}
            >
              <Scaling className="h-3.5 w-3.5" />
            </button>
          </TooltipIcon>
        ) : null}
        {plan.row.includes("rotate") ? (
          <TooltipIcon label="Rotate 90°">
            <button
              type="button"
              aria-label="Rotate 90°"
              onClick={() => onRotate?.()}
              className={toolButton}
                style={buttonStyle}
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </TooltipIcon>
        ) : null}
        {plan.showMore ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More view options" className={toolButton}
                style={buttonStyle}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              {plan.menu.includes("zoom") ? (
                <>
                  <DropdownMenuItem
                    disabled={!zoom.canIn}
                    onSelect={(e) => {
                      e.preventDefault();
                      zoom.step(1);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Zoom in
                    <span className="ml-auto tabular-nums text-muted-foreground">{zoom.label}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!zoom.canOut}
                    onSelect={(e) => {
                      e.preventDefault();
                      zoom.step(-1);
                    }}
                  >
                    <Minus className="h-3.5 w-3.5" /> Zoom out
                  </DropdownMenuItem>
                </>
              ) : null}
              {plan.menu.includes("fitPage") ? (
                <DropdownMenuItem onSelect={() => zoom.setMode("fit")}>
                  <Maximize2 className="h-3.5 w-3.5" /> Fit page
                </DropdownMenuItem>
              ) : null}
              {plan.menu.includes("fitWidth") ? (
                <DropdownMenuItem onSelect={() => zoom.setMode("fit-width")}>
                  <Maximize className="h-3.5 w-3.5" /> Fit width
                </DropdownMenuItem>
              ) : null}
              {plan.menu.includes("actual") ? (
                <DropdownMenuItem onSelect={() => zoom.setMode("actual")}>
                  <Scaling className="h-3.5 w-3.5" /> Actual size
                </DropdownMenuItem>
              ) : null}
              {plan.menu.includes("rotate") ? (
                <DropdownMenuItem onSelect={() => onRotate?.()}>
                  <RotateCw className="h-3.5 w-3.5" /> Rotate 90°
                </DropdownMenuItem>
              ) : null}
              {plan.menu.includes("pager") ? (
                <>
                  <DropdownMenuItem
                    disabled={page <= 1}
                    onSelect={(e) => {
                      e.preventDefault();
                      onPage(Math.max(1, page - 1));
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous {pageLabel}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={page >= pages}
                    onSelect={(e) => {
                      e.preventDefault();
                      onPage(Math.min(pages, page + 1));
                    }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" /> Next {pageLabel}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center" style={ITEM_GROUP_STYLE}>
        {plan.pager !== "none" ? (
          <div
            className="flex shrink-0 items-center" style={ITEM_GROUP_STYLE}
            aria-label={`${pageLabelTitle} pagination`}
          >
            {plan.pager === "full" ? (
              <button
                type="button"
                onClick={() => onPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                aria-label={`Previous ${pageLabel}`}
                className={toolButton}
                style={buttonStyle}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
            <span
              className="shrink-0 text-center font-medium tabular-nums"
              style={{ width: plan.counterWidth }}
            >
              {page} / {pages}
            </span>
            {plan.pager === "full" ? (
              <button
                type="button"
                onClick={() => onPage(Math.min(pages, page + 1))}
                disabled={page >= pages}
                aria-label={`Next ${pageLabel}`}
                className={toolButton}
                style={buttonStyle}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        ) : null}
        {toolbarEnd && plan.host !== "all-folded" ? (
          <>
            {plan.pager !== "none" ? (
              <span aria-hidden className="shrink-0 bg-border" style={SEPARATOR_STYLE} />
            ) : null}
            {plan.host === "end-folded" ? (
              <HostFold
                label="File actions"
                nodes={toolbarEnd}
                className={toolButton}
                style={buttonStyle}
              />
            ) : (
              <div ref={endRef} className="flex shrink-0 items-center" style={ITEM_GROUP_STYLE}>
                {toolbarEnd}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
