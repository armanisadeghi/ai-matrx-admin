"use client"

import { useState, useEffect } from "react"

/**
 * Hook that returns true after the component has mounted on the client.
 * Useful for avoiding hydration mismatches with dynamically generated IDs.
 * 
 * @example
 * const isMounted = useIsMounted()
 * if (!isMounted) return null // or a placeholder
 * return <ComponentWithDynamicIds />
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}
