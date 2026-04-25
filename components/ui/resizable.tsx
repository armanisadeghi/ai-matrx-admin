"use client";

/**
 * react-resizable-panels v4 wrapper
 *
 * v4 changes vs v1/v2:
 * - Group prop: `orientation` (not `direction`)
 * - Data attributes on DOM: `data-group`, `data-panel`, `data-separator` (no `data-panel-group-direction`)
 * - Group sets height:100%/width:100%/overflow:hidden internally
 * - Panel renders two divs: outer (flex sizing) wraps inner (overflow:auto, receives className/style)
 *   To override: pass `style={{ overflow: "hidden", height: "100%" }}` directly to Panel
 * - Separator renders its own div with flexBasis:auto/flexShrink:0
 */

import { DragHandleDots2Icon } from "@radix-ui/react-icons";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/styles/themes/utils";

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof Group>) => (
  <Group className={cn("flex h-full w-full", className)} {...props} />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) => (
  <Separator
    className={cn(
      // Base: thin vertical line using theme border color.
      "relative flex w-0.5 items-center justify-center bg-border transition-colors",
      // Invisible hit target centered on the line (mouse tolerance).
      "after:absolute after:inset-y-0 after:left-1/2 after:w-1.5 after:-translate-x-1/2",
      // CRITICAL: the library sets tabIndex=0 on the separator, so clicking it focuses it.
      // `focus-visible:outline-none` only suppresses the outline on keyboard focus, so the
      // browser's default outline flashes during mouse drag — that's what rendered as
      // near-white in dark mode. Use `focus:outline-none` to suppress it for ALL focus.
      "focus:outline-none",
      // Keyboard-only focus ring (uses --ring from the theme).
      "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
      // State feedback driven by the library's data-separator attribute.
      "data-[separator=hover]:bg-primary",
      "data-[separator=active]:bg-primary",
      // Vertical group handle (orientation="vertical") — separator is horizontal.
      "[&[aria-orientation=horizontal]]:h-0.5 [&[aria-orientation=horizontal]]:w-full",
      "[&[aria-orientation=horizontal]]:after:left-0 [&[aria-orientation=horizontal]]:after:h-1.5",
      "[&[aria-orientation=horizontal]]:after:w-full [&[aria-orientation=horizontal]]:after:-translate-y-1/2",
      "[&[aria-orientation=horizontal]]:after:translate-x-0",
      className,
    )}
    style={{ cursor: "col-resize" }}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <DragHandleDots2Icon className="h-2.5 w-2.5" />
      </div>
    )}
  </Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
