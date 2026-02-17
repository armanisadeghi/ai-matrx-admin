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
import { DeepResearchInline, DeepResearchOverlay } from "./deep-research";
import BraveSearchDisplay from "@/features/workflows/results/registered-components/BraveSearchDisplay";
import { CheckCircle, AlertTriangle } from "lucide-react";
import {
    DynamicInlineRenderer,
    DynamicOverlayRenderer,
    getCachedRenderer,
    isKnownNoDynamic,
} from "./dynamic";

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
    "get_news_headlines": {
        displayName: "News Headlines",
        resultsLabel: "News Results",
        inline: NewsInline,
        overlay: NewsOverlay,
        keepExpandedOnStream: true,
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
        keepExpandedOnStream: true,
        getHeaderSubtitle: (toolUpdates) => {
            const input = toolUpdates.find((u) => u.type === "mcp_input");
            const args = input?.mcp_input?.arguments ?? {};
            const queries = Array.isArray(args.queries) ? args.queries : [];
            if (queries.length > 0) {
                return queries.length === 1 ? String(queries[0]) : `${queries.length} queries`;
            }
            return typeof args.query === "string" ? String(args.query) : null;
        },
        getHeaderExtras: (toolUpdates) => {
            const input = toolUpdates.find((u) => u.type === "mcp_input");
            const args = input?.mcp_input?.arguments ?? {};
            const queryCount = Array.isArray(args.queries) ? (args.queries as unknown[]).length : (typeof args.query === "string" ? 1 : 0);
            const browsingCount = toolUpdates.filter(
                (u) => u.type === "user_visible_message" && u.user_visible_message?.startsWith("Browsing ")
            ).length;
            if (queryCount === 0 && browsingCount === 0) return null;
            const parts: string[] = [];
            if (queryCount > 0) parts.push(`${queryCount} ${queryCount === 1 ? "query" : "queries"}`);
            if (browsingCount > 0) {
                parts.push(`${browsingCount} deep ${browsingCount === 1 ? "read" : "reads"}`);
            } else if (queryCount > 0) {
                parts.push(`~${queryCount * 3} deep reads`);
            }
            return (
                <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
                    <span className="flex items-center gap-1">{parts.join(" \u00B7 ")}</span>
                </div>
            );
        },
    },
    
    // Core Web Search - Multi-query parallel web search
    "core_web_search": {
        displayName: "Multi-Query Search",
        resultsLabel: "Search Results",
        inline: CoreWebSearchInline,
        overlay: CoreWebSearchOverlay,
        keepExpandedOnStream: true, // Keep search results visible
    },
    
    // Deep Research - search + read full web pages
    "core_web_search_and_read": {
        displayName: "Deep Research",
        resultsLabel: "Research Results",
        inline: DeepResearchInline,
        overlay: DeepResearchOverlay,
        keepExpandedOnStream: true,
        getHeaderSubtitle: (toolUpdates) => {
            const input = toolUpdates.find((u) => u.type === "mcp_input");
            const query = input?.mcp_input?.arguments?.query;
            return typeof query === "string" ? query : null;
        },
        getHeaderExtras: (toolUpdates) => {
            const output = toolUpdates.find((u) => u.type === "mcp_output");
            if (!output?.mcp_output?.result) return null;
            const raw = typeof output.mcp_output.result === "string"
                ? output.mcp_output.result
                : JSON.stringify(output.mcp_output.result);
            const readCount = (raw.match(/<read_result>/g) || []).length;
            if (readCount === 0) return null;
            return (
                <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
                    <span className="flex items-center gap-1">
                        {readCount} {readCount === 1 ? "page" : "pages"} read
                    </span>
                </div>
            );
        },
    },
    
    // Web Page Reader - read specific web pages (same format as deep research)
    "core_web_read_web_pages": {
        displayName: "Web Page Reader",
        resultsLabel: "Pages Read",
        inline: DeepResearchInline,
        overlay: DeepResearchOverlay,
        keepExpandedOnStream: true,
    },
};

/**
 * Check if a custom renderer is registered for a given tool name.
 * Checks both the static registry and the dynamic component cache.
 */
export function hasCustomRenderer(toolName: string | null): boolean {
    if (!toolName) return false;
    if (toolName in toolRendererRegistry) return true;
    // Check dynamic cache
    if (getCachedRenderer(toolName)) return true;
    return false;
}

/**
 * Check if a tool might have a dynamic renderer (not yet loaded).
 * Returns true if the tool is NOT in the static registry and NOT known
 * to have no dynamic component.
 */
export function mightHaveDynamicRenderer(toolName: string | null): boolean {
    if (!toolName) return false;
    if (toolName in toolRendererRegistry) return false;
    if (isKnownNoDynamic(toolName)) return false;
    return true;
}

/**
 * Get the inline renderer for a tool.
 *
 * Resolution order:
 * 1. Static registry (core tools with bundled code)
 * 2. Dynamic cache (database-stored components, already compiled)
 * 3. DynamicInlineRenderer wrapper (will fetch + compile on mount)
 * 4. GenericRenderer (final fallback)
 */
export function getInlineRenderer(toolName: string | null): React.ComponentType<ToolRendererProps> {
    if (!toolName) return GenericRenderer;

    // 1. Static registry
    if (toolRendererRegistry[toolName]) {
        return toolRendererRegistry[toolName].inline;
    }

    // 2. Check if dynamic component exists in cache
    const dynamicCached = getCachedRenderer(toolName);
    if (dynamicCached) {
        // Wrap the compiled component in a closure that adds toolName prop
        const cachedToolName = toolName;
        return (props: ToolRendererProps) => (
            <DynamicInlineRenderer toolName={cachedToolName} {...props} />
        );
    }

    // 3. If tool might have a dynamic renderer (not known negative), use the
    //    DynamicInlineRenderer which will attempt to fetch on mount
    if (!isKnownNoDynamic(toolName)) {
        const dynamicToolName = toolName;
        return (props: ToolRendererProps) => (
            <DynamicInlineRenderer toolName={dynamicToolName} {...props} />
        );
    }

    // 4. Final fallback
    return GenericRenderer;
}

/**
 * Get the overlay renderer for a tool.
 *
 * Resolution order mirrors getInlineRenderer but checks for overlay-specific
 * components. Falls back through inline → GenericRenderer.
 */
export function getOverlayRenderer(toolName: string | null): React.ComponentType<ToolRendererProps> {
    if (!toolName) return GenericRenderer;

    // 1. Static registry
    if (toolRendererRegistry[toolName]) {
        const renderer = toolRendererRegistry[toolName];
        return renderer.overlay || renderer.inline || GenericRenderer;
    }

    // 2. Dynamic cache
    const dynamicCached = getCachedRenderer(toolName);
    if (dynamicCached) {
        if (dynamicCached.OverlayComponent) {
            const cachedToolName = toolName;
            return (props: ToolRendererProps) => (
                <DynamicOverlayRenderer toolName={cachedToolName} {...props} />
            );
        }
        // Has dynamic inline but no overlay — use dynamic inline
        const cachedToolName = toolName;
        return (props: ToolRendererProps) => (
            <DynamicInlineRenderer toolName={cachedToolName} {...props} />
        );
    }

    // 3. Might have dynamic
    if (!isKnownNoDynamic(toolName)) {
        const dynamicToolName = toolName;
        return (props: ToolRendererProps) => (
            <DynamicOverlayRenderer toolName={dynamicToolName} {...props} />
        );
    }

    return GenericRenderer;
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
 * Check if a tool should keep expanded when content starts streaming.
 * Checks static registry first, then dynamic cache.
 */
export function shouldKeepExpandedOnStream(toolName: string | null): boolean {
    if (!toolName) return true;

    // Static registry
    if (toolRendererRegistry[toolName]) {
        return toolRendererRegistry[toolName].keepExpandedOnStream ?? false;
    }

    // Dynamic cache
    const dynamic = getCachedRenderer(toolName);
    if (dynamic) return dynamic.keepExpandedOnStream;

    return true; // Default: keep expanded so generic results remain visible
}

/**
 * Get the display name for a tool.
 * Checks static registry, then dynamic cache, then auto-formats.
 */
export function getToolDisplayName(toolName: string | null): string {
    if (!toolName) return "Tool";

    // Static registry
    if (toolRendererRegistry[toolName]?.displayName) {
        return toolRendererRegistry[toolName].displayName;
    }

    // Dynamic cache
    const dynamic = getCachedRenderer(toolName);
    if (dynamic) return dynamic.displayName;

    // Fallback: Convert snake_case to Title Case
    return toolName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/**
 * Get the results tab label for a tool's output in the overlay.
 * Checks static registry, then dynamic cache, then auto-generates.
 */
export function getResultsLabel(toolName: string | null): string {
    if (!toolName) return "Results";

    // Static registry
    const renderer = toolRendererRegistry[toolName];
    if (renderer?.resultsLabel) {
        return renderer.resultsLabel;
    }

    // Dynamic cache
    const dynamic = getCachedRenderer(toolName);
    if (dynamic?.resultsLabel) return dynamic.resultsLabel;

    const displayName = getToolDisplayName(toolName);
    return `${displayName} Results`;
}

/**
 * Get custom header subtitle for a tool's overlay header.
 * Checks static registry first, then dynamic cache.
 */
export function getHeaderSubtitle(
    toolName: string | null,
    toolUpdates: ToolCallObject[]
): string | null {
    if (!toolName) return null;

    // Static registry
    if (toolRendererRegistry[toolName]?.getHeaderSubtitle) {
        return toolRendererRegistry[toolName].getHeaderSubtitle!(toolUpdates);
    }

    // Dynamic cache
    const dynamic = getCachedRenderer(toolName);
    if (dynamic?.getHeaderSubtitle) {
        try {
            return dynamic.getHeaderSubtitle(toolUpdates);
        } catch {
            return null;
        }
    }

    return null;
}

/**
 * Get custom header extras (ReactNode) for a tool's overlay header.
 * Checks static registry first, then dynamic cache.
 */
export function getHeaderExtras(
    toolName: string | null,
    toolUpdates: ToolCallObject[]
): React.ReactNode {
    if (!toolName) return null;

    // Static registry
    if (toolRendererRegistry[toolName]?.getHeaderExtras) {
        return toolRendererRegistry[toolName].getHeaderExtras!(toolUpdates);
    }

    // Dynamic cache
    const dynamic = getCachedRenderer(toolName);
    if (dynamic?.getHeaderExtras) {
        try {
            return dynamic.getHeaderExtras(toolUpdates);
        } catch {
            return null;
        }
    }

    return null;
}

/**
 * Register a new tool renderer
 * @param toolName - Name of the tool (matches mcp_input.name)
 * @param renderer - Renderer configuration with inline and optional overlay
 */
export function registerToolRenderer(toolName: string, renderer: ToolRenderer): void {
    toolRendererRegistry[toolName] = renderer;
}

