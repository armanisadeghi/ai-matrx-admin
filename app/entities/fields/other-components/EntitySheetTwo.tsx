"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { Cross2Icon } from "@radix-ui/react-icons"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui"

// Maintain the same variant definitions
const sheetVariants = cva(
  "gap-4 bg-background p-6 shadow-lg",
  {
    variants: {
      position: {
        top: "border-b",
        bottom: "border-t",
        left: "h-full border-r",
        right: "h-full border-l",
        center: "border rounded-lg",
      },
      size: {
        sm: "",
        md: "",
        default: "",
        lg: "",
        xl: "",
        full: "",
      },
    },
    compoundVariants: [
      // Side sheets (left/right)
      { position: ["left", "right"], size: "sm", class: "w-3/4 sm:max-w-sm" },
      { position: ["left", "right"], size: "md", class: "w-3/4 sm:max-w-md" },
      { position: ["left", "right"], size: "default", class: "w-3/4 sm:max-w-md" },
      { position: ["left", "right"], size: "lg", class: "w-3/4 sm:max-w-lg" },
      { position: ["left", "right"], size: "xl", class: "w-3/4 sm:max-w-xl" },
      { position: ["left", "right"], size: "full", class: "w-screen" },
      // Top/Bottom sheets
      { position: ["top", "bottom"], size: "sm", class: "max-h-[35vh]" },
      { position: ["top", "bottom"], size: "md", class: "max-h-[50vh]" },
      { position: ["top", "bottom"], size: "default", class: "max-h-[50vh]" },
      { position: ["top", "bottom"], size: "lg", class: "max-h-[65vh]" },
      { position: ["top", "bottom"], size: "xl", class: "max-h-[75vh]" },
      { position: ["top", "bottom"], size: "full", class: "max-h-screen" },
      // Center sheets
      { position: "center", size: "sm", class: "max-w-sm max-h-[90vh]" },
      { position: "center", size: "md", class: "max-w-md max-h-[90vh]" },
      { position: "center", size: "default", class: "max-w-md max-h-[90vh]" },
      { position: "center", size: "lg", class: "max-w-lg max-h-[90vh]" },
      { position: "center", size: "xl", class: "max-w-xl max-h-[90vh]" },
      { position: "center", size: "full", class: "max-w-[95vw] max-h-[95vh]" },
    ],
    defaultVariants: {
      position: "right",
      size: "md",
    },
  }
)

interface EntitySheetProps extends React.ComponentProps<typeof Sheet> {
  position?: VariantProps<typeof sheetVariants>["position"]
  size?: VariantProps<typeof sheetVariants>["size"]
  showClose?: boolean
  trigger?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function EntitySheetTwo({
  position = "right",
  size = "md",
  showClose = true,
  trigger,
  title,
  description,
  footer,
  className,
  children,
  ...props
}: EntitySheetProps) {
  return (
    <Sheet {...props}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent
        side={position === "center" ? undefined : position}
        className={cn(sheetVariants({ position, size }), className)}
      >
        <div className="flex h-full flex-col">
          {(title || description) && (
            <SheetHeader className="mb-4 flex-none">
              {title && (
                <SheetTitle className="text-lg font-semibold">
                  {title}
                </SheetTitle>
              )}
              {description && (
                <SheetDescription className="text-sm text-muted-foreground">
                  {description}
                </SheetDescription>
              )}
            </SheetHeader>
          )}

          {showClose && (
            <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
              <Cross2Icon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          )}

          <ScrollArea className="flex-1 scrollbar-none">
            <div className="h-full">{children}</div>
          </ScrollArea>

          {footer && (
            <div className="mt-4 flex-none flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              {footer}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default EntitySheetTwo