"use client";

import { usePathname } from "next/navigation";

/**
 * Returns the correct base path for prompt routes based on the current shell context.
 * SSR shell: /ssr/prompts
 * Authenticated shell: /ai/prompts
 */
export function usePromptsBasePath(): string {
    const pathname = usePathname();
    return pathname?.startsWith("/ssr/") ? "/ssr/prompts" : "/ai/prompts";
}
