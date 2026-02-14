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
     * @param initialTab - Optional tab ID to open initially (format: "tool-group-{id}")
     */
    onOpenOverlay?: (initialTab?: string) => void;
    
    /**
     * The unique ID for this tool's group in the overlay.
     * Used to build the tab ID: `tool-group-${toolGroupId}`.
     * Passed down from ToolCallVisualization based on the tool call's `id` field.
     */
    toolGroupId?: string;
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

