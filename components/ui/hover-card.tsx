"use client"

import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

import { cn } from "@/lib/utils"
import { useIsMounted } from "@/hooks/use-is-mounted"

/**
 * Hydration-safe HoverCard wrapper.
 * Radix UI generates dynamic IDs for aria-controls that can differ between
 * SSR and client, causing hydration mismatches. This wrapper defers rendering
 * until after hydration to prevent these errors.
 */
const HoverCard = React.forwardRef<
  React.ComponentRef<typeof HoverCardPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Root>
>(({ children, ...props }, ref) => {
  const isMounted = useIsMounted()
  
  if (!isMounted) {
    return null
  }
  
  return (
    <HoverCardPrimitive.Root {...props}>
      {children}
    </HoverCardPrimitive.Root>
  )
})
HoverCard.displayName = "HoverCard"

const HoverCardTrigger = HoverCardPrimitive.Trigger

const HoverCardContent = React.forwardRef<
  React.ComponentRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }
