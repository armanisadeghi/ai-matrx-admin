"use client";

import React from "react";
import { ToolRegistry, ToolRenderer, ToolRendererProps, getToolNameFromUpdates } from "./types";
import { GenericRenderer } from "./GenericRenderer";
import { ToolCallObject } from "@/lib/redux/socket-io/socket.types";
import { BraveSearchInline } from "./brave-search";
import { NewsInline, NewsOverlay } from "./news-api";
import { SeoMetaTagsInline, SeoMetaTagsOverlay } from "./seo-meta-tags";
import { SeoMetaTitlesInline } from "./seo-meta-titles";
import { SeoMetaDescriptionsInline } from "./seo-meta-descriptions";
import { WebResearchInline, WebResearchOverlay } from "./web-research";
import { CoreWebSearchInline, CoreWebSearchOverlay } from "./core-web-search";
import BraveSearchDisplay from "@/features/workflows/results/registered-components/BraveSearchDisplay";

/**
 * Main registry of tool renderers
 * Add new tools here as you create their renderer components
 */
export const toolRendererRegistry: ToolRegistry = {
    // Web Search (Brave) - uses existing overlay component
    "web_search": {
        displayName: "Web Search",
        resultsLabel: "Search Results",
        inline: BraveSearchInline,
        overlay: (props) => {
            // Adapt BraveSearchDisplay to work with ToolRendererProps
            const stepDataUpdate = props.toolUpdates.find(
                u => u.type === "step_data" && u.step_data?.type === "brave_default_page"
            );
            
            if (!stepDataUpdate?.step_data) {
                return <GenericRenderer {...props} />;
            }
            
            return <BraveSearchDisplay data={stepDataUpdate.step_data as any} />;
        },
    },
    
    // News API - custom inline and overlay components
    "api_news_fetch_headlines": {
        displayName: "News Headlines",
        resultsLabel: "News Results",
        inline: NewsInline,
        overlay: NewsOverlay,
        keepExpandedOnStream: true, // Keep news visible when response streams
    },
    
    // SEO Meta Tags Checker - batch analysis display
    "seo_check_meta_tags_batch": {
        displayName: "SEO Meta Tags",
        resultsLabel: "Meta Tags Results",
        inline: SeoMetaTagsInline,
        overlay: SeoMetaTagsOverlay,
        keepExpandedOnStream: true, // Keep results visible for review
    },
    
    // SEO Meta Titles Checker - title-only analysis
    "seo_check_meta_titles": {
        displayName: "SEO Title Checker",
        resultsLabel: "Title Results",
        inline: SeoMetaTitlesInline,
        keepExpandedOnStream: true, // Keep titles visible for review
    },
    
    // SEO Meta Descriptions Checker - description-only analysis
    "seo_check_meta_descriptions": {
        displayName: "SEO Description Checker",
        resultsLabel: "Description Results",
        inline: SeoMetaDescriptionsInline,
        keepExpandedOnStream: true, // Keep descriptions visible for review
    },
    
    // Web Research v1 - AI-powered multi-page research with summaries
    "web_search_v1": {
        displayName: "Web Research",
        resultsLabel: "Research Results",
        inline: WebResearchInline,
        overlay: WebResearchOverlay,
        keepExpandedOnStream: true, // Keep research visible
    },
    
    // Core Web Search - Multi-query parallel web search
    "core_web_search": {
        displayName: "Multi-Query Search",
        resultsLabel: "Search Results",
        inline: CoreWebSearchInline,
        overlay: CoreWebSearchOverlay,
        keepExpandedOnStream: true, // Keep search results visible
    },
};

/**
 * Check if a custom renderer is registered for a given tool name
 */
export function hasCustomRenderer(toolName: string | null): boolean {
    if (!toolName) return false;
    return toolName in toolRendererRegistry;
}

/**
 * Get the inline renderer for a tool
 * @param toolName - Name of the tool from mcp_input.name
 * @returns Inline renderer component or GenericRenderer fallback
 */
export function getInlineRenderer(toolName: string | null): React.ComponentType<ToolRendererProps> {
    if (!toolName || !toolRendererRegistry[toolName]) {
        return GenericRenderer;
    }
    return toolRendererRegistry[toolName].inline;
}

/**
 * Get the overlay renderer for a tool
 * Falls back to inline renderer if no overlay specified, then to GenericRenderer
 * @param toolName - Name of the tool from mcp_input.name
 * @returns Overlay renderer component
 */
export function getOverlayRenderer(toolName: string | null): React.ComponentType<ToolRendererProps> {
    if (!toolName || !toolRendererRegistry[toolName]) {
        return GenericRenderer;
    }
    
    const renderer = toolRendererRegistry[toolName];
    // Prefer overlay renderer, fall back to inline, then generic
    return renderer.overlay || renderer.inline || GenericRenderer;
}

/**
 * Get tool name from an array of tool updates
 * @param toolUpdates - Array of tool call objects
 * @returns Tool name or null
 */
export function getToolName(toolUpdates: ToolCallObject[]): string | null {
    return getToolNameFromUpdates(toolUpdates);
}

/**
 * Check if a tool should keep expanded when content starts streaming
 * @param toolName - Name of the tool from mcp_input.name
 * @returns true if tool should stay expanded, false if it should auto-collapse
 */
export function shouldKeepExpandedOnStream(toolName: string | null): boolean {
    if (!toolName || !toolRendererRegistry[toolName]) {
        return true; // Default: keep expanded so generic results remain visible
    }
    return toolRendererRegistry[toolName].keepExpandedOnStream ?? false;
}

/**
 * Get the display name for a tool
 * @param toolName - Name of the tool from mcp_input.name
 * @returns Pretty display name or formatted fallback
 */
export function getToolDisplayName(toolName: string | null): string {
    if (!toolName) return "Tool";
    
    if (toolRendererRegistry[toolName]?.displayName) {
        return toolRendererRegistry[toolName].displayName;
    }
    
    // Fallback: Convert snake_case to Title Case
    return toolName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Get the results tab label for a tool's output in the overlay.
 * Uses custom resultsLabel from registry, falls back to "${displayName} Results",
 * and finally falls back to auto-generated title case from the tool name + " Results".
 * @param toolName - Name of the tool from mcp_input.name
 * @returns Formatted results label
 */
export function getResultsLabel(toolName: string | null): string {
    if (!toolName) return "Results";
    
    const renderer = toolRendererRegistry[toolName];
    if (renderer?.resultsLabel) {
        return renderer.resultsLabel;
    }
    
    // Fallback: use displayName + " Results"
    const displayName = getToolDisplayName(toolName);
    return `${displayName} Results`;
}

/**
 * Register a new tool renderer
 * @param toolName - Name of the tool (matches mcp_input.name)
 * @param renderer - Renderer configuration with inline and optional overlay
 */
export function registerToolRenderer(toolName: string, renderer: ToolRenderer): void {
    toolRendererRegistry[toolName] = renderer;
}

