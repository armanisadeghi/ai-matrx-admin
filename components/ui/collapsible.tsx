"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { useIsMounted } from "@/hooks/use-is-mounted"

/**
 * Hydration-safe Collapsible wrapper.
 * Radix UI generates dynamic IDs for aria-controls that can differ between
 * SSR and client, causing hydration mismatches. This wrapper defers rendering
 * until after hydration to prevent these errors.
 */
const Collapsible = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>
>(({ children, ...props }, ref) => {
  const isMounted = useIsMounted()
  
  if (!isMounted) {
    return null
  }
  
  return (
    <CollapsiblePrimitive.Root {...props}>
      {children}
    </CollapsiblePrimitive.Root>
  )
})
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
