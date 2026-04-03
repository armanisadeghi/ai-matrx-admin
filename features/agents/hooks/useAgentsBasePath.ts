"use client";

import { usePathname } from "next/navigation";

/**
 * Returns the correct base path for agent routes based on the current shell context.
 * SSR shell: /ssr/agents
 * Authenticated shell: /ai/agents
 */
export function useAgentsBasePath(): string {
  const pathname = usePathname();
  return pathname?.startsWith("/ssr/") ? "/ssr/agents" : "/ai/agents";
}
