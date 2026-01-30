"use client"

import { DragHandleDots2Icon } from "@radix-ui/react-icons"
import React from "react"
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"
import { cn } from "@/styles/themes/utils"

const handleSizes = {
  xs: "w-1 data-[panel-group-direction=vertical]:h-1",
  sm: "w-1.5 data-[panel-group-direction=vertical]:h-1.5",
  md: "w-2 data-[panel-group-direction=vertical]:h-2",
  lg: "w-3 data-[panel-group-direction=vertical]:h-3",
  xl: "w-4 data-[panel-group-direction=vertical]:h-4",
  "2xl": "w-6 data-[panel-group-direction=vertical]:h-6",
  "3xl": "w-8 data-[panel-group-direction=vertical]:h-8",
  "4xl": "w-10 data-[panel-group-direction=vertical]:h-10",
} as const

type HandleSize = keyof typeof handleSizes

const ResizablePanelGroup = ({
                               className,
                               ...props
                             }: React.ComponentProps<typeof PanelGroup>) => (
    <PanelGroup
        className={cn(
            "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
            className
        )}
        {...props}
    />
)

const ResizablePanel = Panel

interface ResizableHandleProps extends React.ComponentProps<typeof PanelResizeHandle> {
  withHandle?: boolean
  size?: HandleSize
}

const ResizableHandle = ({
                           withHandle,
                           size = "md",
                           className,
                           ...props
                         }: ResizableHandleProps) => (
    <PanelResizeHandle
        className={cn(
            "relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
            "data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:h-1.5",
            "data-[panel-group-direction=horizontal]:w-1.5 data-[panel-group-direction=horizontal]:h-full",
            className
        )}
        {...props}
    >
      {withHandle && (
          <div
              className={cn(
                  "z-10 flex items-center justify-center rounded-sm border bg-border",
                  "data-[panel-group-direction=vertical]:h-4 data-[panel-group-direction=vertical]:w-8",
                  "data-[panel-group-direction=horizontal]:h-8 data-[panel-group-direction=horizontal]:w-4",
                  "[&[data-panel-group-direction=vertical]>div]:rotate-90"
              )}
          >
            <DragHandleDots2Icon className="h-2.5 w-2.5" />
          </div>
      )}
    </PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
export type { HandleSize }
