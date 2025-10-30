// File: @/utils/favicon-utils.ts
// Utilities for managing dynamic favicons across the application

import { allNavigationLinks, type FaviconConfig } from "@/constants/navigation-links";
import { Metadata } from "next";

/**
 * Generates an SVG favicon with the given configuration
 * @param config - The favicon configuration (color and letter/emoji)
 * @returns SVG string for the favicon
 */
export function generateSVGFavicon(config: FaviconConfig): string {
    const { color, letter, emoji } = config;
    const displayText = emoji || letter || "M";
    
    // Adjust font size based on text length
    const fontSize = displayText.length === 1 ? "48" : displayText.length === 2 ? "36" : "28";
    const yPosition = displayText.length === 1 ? "56" : "54";
    
    return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <rect width="64" height="64" fill="${color}" rx="12"/>
            <text 
                x="32" 
                y="${yPosition}" 
                font-family="system-ui, -apple-system, sans-serif" 
                font-size="${fontSize}" 
                font-weight="700" 
                fill="white" 
                text-anchor="middle"
            >${displayText}</text>
        </svg>
    `.trim();
}

/**
 * Converts an SVG string to a data URI that can be used as favicon
 * @param svg - SVG string
 * @returns Data URI string
 */
export function svgToDataURI(svg: string): string {
    const encoded = encodeURIComponent(svg)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");
    return `data:image/svg+xml,${encoded}`;
}

/**
 * Finds the navigation link configuration for a given route
 * @param pathname - The current pathname (e.g., "/notes", "/chat")
 * @returns The matching navigation link or undefined
 */
export function findNavigationLinkByPath(pathname: string): typeof allNavigationLinks[0] | undefined {
    // Try exact match first
    const exactMatch = allNavigationLinks.find(link => link.href === pathname);
    if (exactMatch) return exactMatch;
    
    // Try to match by route prefix (for nested routes)
    // Sort by href length (descending) to match more specific routes first
    const sortedLinks = [...allNavigationLinks].sort((a, b) => b.href.length - a.href.length);
    return sortedLinks.find(link => pathname.startsWith(link.href));
}

/**
 * Gets the favicon configuration for a given route
 * @param pathname - The current pathname
 * @returns FaviconConfig or undefined if no match
 */
export function getFaviconConfigByPath(pathname: string): FaviconConfig | undefined {
    const link = findNavigationLinkByPath(pathname);
    return link?.favicon;
}

/**
 * Generates Next.js metadata with a custom favicon for the given route
 * @param pathname - The current pathname
 * @param additionalMetadata - Additional metadata to merge
 * @returns Metadata object for Next.js
 */
export function generateFaviconMetadata(
    pathname: string, 
    additionalMetadata?: Partial<Metadata>
): Metadata {
    const config = getFaviconConfigByPath(pathname);
    
    if (!config) {
        // Return empty metadata if no config found
        return (additionalMetadata || {}) as Metadata;
    }
    
    const svg = generateSVGFavicon(config);
    const dataURI = svgToDataURI(svg);
    
    const faviconIcons = {
        icon: [
            { url: dataURI, type: "image/svg+xml" },
        ],
    };
    
    // Merge with additional metadata if provided
    if (additionalMetadata) {
        const result: Metadata = {
            ...additionalMetadata,
        };
        
        // Merge icons properly - prioritize our favicon icon
        if (additionalMetadata.icons && typeof additionalMetadata.icons === 'object' && !Array.isArray(additionalMetadata.icons)) {
            result.icons = {
                ...(additionalMetadata.icons as Record<string, any>),
                ...faviconIcons,
            };
        } else {
            result.icons = faviconIcons;
        }
        
        return result;
    }
    
    return {
        icons: faviconIcons,
    };
}

/**
 * Helper to create a favicon metadata object with custom config
 * Useful for routes that don't have a navigation link but still need a unique favicon
 * @param config - Custom favicon configuration
 * @param additionalMetadata - Additional metadata to merge
 * @returns Metadata object for Next.js
 */
export function createCustomFaviconMetadata(
    config: FaviconConfig,
    additionalMetadata?: Partial<Metadata>
): Metadata {
    const svg = generateSVGFavicon(config);
    const dataURI = svgToDataURI(svg);
    
    const faviconIcons = {
        icon: [
            { url: dataURI, type: "image/svg+xml" },
        ],
    };
    
    if (additionalMetadata) {
        const result: Metadata = {
            ...additionalMetadata,
        };
        
        // Merge icons properly - prioritize our favicon icon
        if (additionalMetadata.icons && typeof additionalMetadata.icons === 'object' && !Array.isArray(additionalMetadata.icons)) {
            result.icons = {
                ...(additionalMetadata.icons as Record<string, any>),
                ...faviconIcons,
            };
        } else {
            result.icons = faviconIcons;
        }
        
        return result;
    }
    
    return {
        icons: faviconIcons,
    };
}

/**
 * Gets all routes that have favicon configurations
 * Useful for generating static favicons or documentation
 */
export function getAllRoutesWithFavicons() {
    return allNavigationLinks
        .filter(link => link.favicon)
        .map(link => ({
            label: link.label,
            href: link.href,
            favicon: link.favicon!,
        }));
}

