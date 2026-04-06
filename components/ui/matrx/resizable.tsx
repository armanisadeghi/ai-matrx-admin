"use client"

import { DragHandleDots2Icon } from "@radix-ui/react-icons"
import React from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { cn } from "@/styles/themes/utils"

/**
 * react-resizable-panels v4 wrapper (matrx variant with configurable handle sizes)
 *
 * v4 breaking changes vs v1/v2:
 * - `data-panel-group-direction` attribute removed → use `aria-orientation` on Separator
 * - Numeric size props are PIXELS → use strings for percentages (e.g. "30%")
 * - Group internally sets display:flex, flex-direction, overflow:hidden
 * - Separator has aria-orientation="vertical" in horizontal groups, "horizontal" in vertical groups
 */

const handleSizes = {
  xs: "w-1 [&[aria-orientation=horizontal]]:w-auto [&[aria-orientation=horizontal]]:h-1",
  sm: "w-1.5 [&[aria-orientation=horizontal]]:w-auto [&[aria-orientation=horizontal]]:h-1.5",
  md: "w-2 [&[aria-orientation=horizontal]]:w-auto [&[aria-orientation=horizontal]]:h-2",
  lg: "w-3 [&[aria-orientation=horizontal]]:w-auto [&[aria-orientation=horizontal]]:h-3",
  xl: "w-4 [&[aria-orientation=horizontal]]:w-auto [&[aria-orientation=horizontal]]:h-4",
  "2xl": "w-6 [&[aria-orientation=horizontal]]:w-auto [&[aria-orientation=horizontal]]:h-6",
  "3xl": "w-8 [&[aria-orientation=horizontal]]:w-auto [&[aria-orientation=horizontal]]:h-8",
  "4xl": "w-10 [&[aria-orientation=horizontal]]:w-auto [&[aria-orientation=horizontal]]:h-10",
} as const

type HandleSize = keyof typeof handleSizes

const ResizablePanelGroup = ({
                               className,
                               ...props
                             }: React.ComponentProps<typeof Group>) => (
    <Group
        className={cn(
            "flex h-full w-full",
            className
        )}
        {...props}
    />
)

const ResizablePanel = Panel

interface ResizableHandleProps extends React.ComponentProps<typeof Separator> {
  withHandle?: boolean
  size?: HandleSize
}

const ResizableHandle = ({
                           withHandle,
                           size = "md",
                           className,
                           ...props
                         }: ResizableHandleProps) => (
    <Separator
        className={cn(
            "group/handle relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
            "[&[aria-orientation=horizontal]]:w-full [&[aria-orientation=horizontal]]:h-1.5",
            "[&[aria-orientation=vertical]]:w-1.5 [&[aria-orientation=vertical]]:h-full",
            handleSizes[size],
            className
        )}
        {...props}
    >
      {withHandle && (
          <div
              className={cn(
                  "z-10 flex items-center justify-center rounded-sm border bg-border",
                  "h-8 w-4",
                  "group-aria-[orientation=horizontal]/handle:h-4 group-aria-[orientation=horizontal]/handle:w-8"
              )}
          >
            <DragHandleDots2Icon className="h-2.5 w-2.5 group-aria-[orientation=horizontal]/handle:rotate-90" />
          </div>
      )}
    </Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
export type { HandleSize }
