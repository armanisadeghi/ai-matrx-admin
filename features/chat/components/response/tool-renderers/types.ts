import { ToolCallObject } from "@/lib/redux/socket-io/socket.types";

/**
 * Props passed to inline and overlay tool renderers
 */
export interface ToolRendererProps {
    /**
     * Array of all tool updates for this tool call
     */
    toolUpdates: ToolCallObject[];
    
    /**
     * Current index in the tool updates array being rendered
     * Useful for identifying which specific update triggered this render
     */
    currentIndex?: number;
    
    /**
     * Callback to open the overlay modal
     * @param initialTab - Optional tab ID to open initially
     */
    onOpenOverlay?: (initialTab?: string) => void;
    
    /**
     * The starting index of this group's first update within the full toolUpdates array.
     * Used to compute correct global tab IDs (e.g., `tool-update-${globalIndexOffset + localIndex}`).
     * Defaults to 0 for single-tool scenarios.
     */
    globalIndexOffset?: number;
}

/**
 * A tool renderer configuration
 * Each tool can provide an inline renderer (required) and optionally an overlay renderer
 */
export interface ToolRenderer {
    /**
     * Human-readable display name for the tool
     * Example: "SEO Meta Tags Checker" instead of "seo_check_meta_tags_batch"
     */
    displayName: string;
    
    /**
     * Custom label for the results/output tab in the overlay modal.
     * Example: "News Results", "Search Results"
     * If not provided, defaults to `${displayName} Results`
     */
    resultsLabel?: string;
    
    /**
     * Component for inline display (shown directly in the chat stream)
     * This should be compact and preview-focused
     */
    inline: React.ComponentType<ToolRendererProps>;
    
    /**
     * Optional component for overlay display (shown in the modal)
     * If not provided, will fall back to inline component or generic JSON view
     */
    overlay?: React.ComponentType<ToolRendererProps>;
    
    /**
     * Whether to keep the tool display expanded when content starts streaming
     * Default: false (will auto-collapse)
     */
    keepExpandedOnStream?: boolean;
    
    /**
     * Update types to show as individual tabs in the overlay.
     * By default, only "mcp_input", "mcp_output", "mcp_error", and "step_data" get tabs.
     * Set to "all" to include every update type (including user_visible_message).
     * Or provide an array of specific types to include.
     */
    overlayTabTypes?: "all" | ToolCallObject["type"][];
}

/**
 * Registry mapping tool names to their renderers
 */
export interface ToolRegistry {
    [toolName: string]: ToolRenderer;
}

/**
 * Helper to extract tool name from tool updates array
 */
export function getToolNameFromUpdates(toolUpdates: ToolCallObject[]): string | null {
    const inputUpdate = toolUpdates.find((u) => u.type === "mcp_input");
    return inputUpdate?.mcp_input?.name || null;
}

