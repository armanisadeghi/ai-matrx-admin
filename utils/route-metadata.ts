// File: @/utils/route-metadata.ts
// Simplified helper for generating route metadata with favicons

import { Metadata } from "next";
import { generateFaviconMetadata } from "./favicon-utils";

/**
 * Creates metadata for a route with automatic favicon based on the route path
 * @param pathname - The route path (e.g., "/notes", "/chat")
 * @param options - Additional metadata options
 * @returns Complete metadata object with favicon
 * 
 * @example
 * // In app/(authenticated)/notes/page.tsx or layout.tsx
 * export const metadata = createRouteMetadata("/notes", {
 *   title: "Notes",
 *   description: "Manage your notes"
 * });
 */
export function createRouteMetadata(
    pathname: string,
    options?: {
        title?: string;
        description?: string;
        additionalMetadata?: Partial<Metadata>;
    }
): Metadata {
    const { title, description, additionalMetadata } = options || {};
    
    const baseMetadata: Partial<Metadata> = {};
    
    if (title) {
        baseMetadata.title = title;
    }
    
    if (description) {
        baseMetadata.description = description;
    }
    
    // Merge with any additional metadata
    const mergedMetadata = {
        ...baseMetadata,
        ...additionalMetadata,
    };
    
    // Generate favicon metadata and merge
    return generateFaviconMetadata(pathname, mergedMetadata);
}

/**
 * Quick helper to just get the favicon metadata for a route
 * @param pathname - The route path
 * @returns Metadata object with only favicon configuration
 * 
 * @example
 * export const metadata = getRouteFavicon("/chat");
 */
export function getRouteFavicon(pathname: string): Metadata {
    return generateFaviconMetadata(pathname);
}

