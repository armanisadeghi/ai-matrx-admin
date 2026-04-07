// File: @/utils/route-metadata.ts
// Simplified helper for generating route metadata with favicons

import { Metadata } from "next";
import { generateFaviconMetadata } from "./favicon-utils";
import { siteConfig } from "@/config/extras/site";

/**
 * Creates metadata for a route with automatic favicon, OpenGraph, and Twitter cards
 * based on the route path.
 *
 * @param pathname - The route path (e.g., "/notes", "/chat", "/agents")
 * @param options - Additional metadata options
 * @returns Complete metadata object with favicon + social cards
 *
 * @example
 * // In app/(a)/agents/layout.tsx
 * export const metadata = createRouteMetadata("/agents", {
 *   title: "Agents",
 *   description: "Build, configure, and deploy AI agents",
 *   additionalMetadata: {
 *     keywords: ["AI agents", "agent builder"],
 *   },
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

    // Auto-generate OpenGraph if not explicitly provided
    if (!additionalMetadata?.openGraph && (title || description)) {
        baseMetadata.openGraph = {
            title: title ? `${title} | AI Matrx` : "AI Matrx",
            description: description || siteConfig.description,
            type: "website",
            siteName: "AI Matrx",
            images: [
                {
                    url: siteConfig.ogImage,
                    width: 1200,
                    height: 630,
                    alt: title || "AI Matrx",
                },
            ],
        };
    }

    // Auto-generate Twitter card if not explicitly provided
    if (!additionalMetadata?.twitter && (title || description)) {
        baseMetadata.twitter = {
            card: "summary_large_image",
            title: title ? `${title} | AI Matrx` : "AI Matrx",
            description: description || siteConfig.description,
            images: [siteConfig.ogImage],
        };
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
 * Creates metadata for dynamic [id] routes with full favicon, OpenGraph, and Twitter cards.
 * Use this inside `generateMetadata` functions where title/description come from fetched data.
 *
 * @param pathname - The base route path for favicon lookup (e.g., "/agents")
 * @param options - Dynamic metadata options
 * @returns Complete metadata object with favicon + social cards
 *
 * @example
 * // In app/(a)/agents/[id]/layout.tsx
 * export async function generateMetadata({ params }) {
 *   const { id } = await params;
 *   const agent = await getAgent(id);
 *   return createDynamicRouteMetadata("/agents", {
 *     title: agent.name,
 *     description: agent.description,
 *   });
 * }
 */
export function createDynamicRouteMetadata(
    pathname: string,
    options: {
        title: string;
        description?: string;
        ogImage?: string;
    }
): Metadata {
    const { title, description, ogImage } = options;
    const desc = description || siteConfig.description;
    const image = ogImage || siteConfig.ogImage;

    return generateFaviconMetadata(pathname, {
        title,
        description: desc,
        openGraph: {
            title: `${title} | AI Matrx`,
            description: desc,
            type: "website",
            siteName: "AI Matrx",
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: `${title} | AI Matrx`,
            description: desc,
            images: [image],
        },
    });
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
