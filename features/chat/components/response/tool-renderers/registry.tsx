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
import { CheckCircle, AlertTriangle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SEO header extras helpers
// ─────────────────────────────────────────────────────────────────────────────

function seoMetaTagsHeaderExtras(toolUpdates: ToolCallObject[]): React.ReactNode {
    const outputUpdate = toolUpdates.find((u) => u.type === "mcp_output");
    if (!outputUpdate?.mcp_output) return null;
    const rawResult = outputUpdate.mcp_output.result;
    if (!rawResult || typeof rawResult !== "object") return null;
    const result = rawResult as { batch_analysis?: Array<{ overall_ok: boolean }>; count?: number };
    if (!result.batch_analysis) return null;
    const total = result.count ?? result.batch_analysis.length;
    const passed = result.batch_analysis.filter((a) => a.overall_ok).length;
    const failed = total - passed;
    return (
        <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{passed} Passed</span>
            {failed > 0 && <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{failed} Need Attention</span>}
            <span className="ml-auto text-white/60">Total: {total}</span>
        </div>
    );
}

function seoTitlesHeaderExtras(toolUpdates: ToolCallObject[]): React.ReactNode {
    const outputUpdate = toolUpdates.find((u) => u.type === "mcp_output");
    if (!outputUpdate?.mcp_output) return null;
    const rawResult = outputUpdate.mcp_output.result;
    if (!rawResult || typeof rawResult !== "object") return null;
    const result = rawResult as { title_analysis?: Array<{ title_ok: boolean }>; count?: number };
    if (!result.title_analysis) return null;
    const total = result.count ?? result.title_analysis.length;
    const passed = result.title_analysis.filter((a) => a.title_ok).length;
    const failed = total - passed;
    return (
        <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{passed} Passed</span>
            {failed > 0 && <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{failed} Need Attention</span>}
            <span className="ml-auto text-white/60">Total: {total}</span>
        </div>
    );
}

function seoDescriptionsHeaderExtras(toolUpdates: ToolCallObject[]): React.ReactNode {
    const outputUpdate = toolUpdates.find((u) => u.type === "mcp_output");
    if (!outputUpdate?.mcp_output) return null;
    const rawResult = outputUpdate.mcp_output.result;
    if (!rawResult || typeof rawResult !== "object") return null;
    const result = rawResult as { description_analysis?: Array<{ description_ok: boolean }>; count?: number };
    if (!result.description_analysis) return null;
    const total = result.count ?? result.description_analysis.length;
    const passed = result.description_analysis.filter((a) => a.description_ok).length;
    const failed = total - passed;
    return (
        <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{passed} Passed</span>
            {failed > 0 && <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{failed} Need Attention</span>}
            <span className="ml-auto text-white/60">Total: {total}</span>
        </div>
    );
}

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
        keepExpandedOnStream: true,
        getHeaderExtras: seoMetaTagsHeaderExtras,
    },
    
    // SEO Meta Titles Checker - title-only analysis
    "seo_check_meta_titles": {
        displayName: "SEO Title Checker",
        resultsLabel: "Title Results",
        inline: SeoMetaTitlesInline,
        keepExpandedOnStream: true,
        getHeaderExtras: seoTitlesHeaderExtras,
    },
    
    // SEO Meta Descriptions Checker - description-only analysis
    "seo_check_meta_descriptions": {
        displayName: "SEO Description Checker",
        resultsLabel: "Description Results",
        inline: SeoMetaDescriptionsInline,
        keepExpandedOnStream: true,
        getHeaderExtras: seoDescriptionsHeaderExtras,
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
 * Get custom header subtitle for a tool's overlay header.
 * Returns null if no custom subtitle is defined (falls back to default behavior).
 * @param toolName - Name of the tool from mcp_input.name
 * @param toolUpdates - Array of all tool updates for this tool call
 * @returns Custom subtitle string, or null for default
 */
export function getHeaderSubtitle(toolName: string | null, toolUpdates: ToolCallObject[]): string | null {
    if (!toolName || !toolRendererRegistry[toolName]?.getHeaderSubtitle) return null;
    return toolRendererRegistry[toolName].getHeaderSubtitle!(toolUpdates);
}

/**
 * Get custom header extras (ReactNode) for a tool's overlay header.
 * Returns null if no custom extras are defined.
 * @param toolName - Name of the tool from mcp_input.name
 * @param toolUpdates - Array of all tool updates for this tool call
 * @returns ReactNode to render in header, or null
 */
export function getHeaderExtras(toolName: string | null, toolUpdates: ToolCallObject[]): React.ReactNode {
    if (!toolName || !toolRendererRegistry[toolName]?.getHeaderExtras) return null;
    return toolRendererRegistry[toolName].getHeaderExtras!(toolUpdates);
}

/**
 * Register a new tool renderer
 * @param toolName - Name of the tool (matches mcp_input.name)
 * @param renderer - Renderer configuration with inline and optional overlay
 */
export function registerToolRenderer(toolName: string, renderer: ToolRenderer): void {
    toolRendererRegistry[toolName] = renderer;
}

