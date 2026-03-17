/**
 * Types for the Dynamic Tool UI Components system.
 *
 * This system allows tool renderers to be stored in the database and
 * compiled at runtime, so new tool UIs can be added without code deploys.
 */

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

/** Row from `tool_ui_components` table */
export interface ToolUiComponentRow {
    id: string;
    tool_id: string | null;
    tool_name: string;
    display_name: string;
    results_label: string | null;

    inline_code: string;
    overlay_code: string | null;
    utility_code: string | null;
    header_extras_code: string | null;
    header_subtitle_code: string | null;

    keep_expanded_on_stream: boolean;
    allowed_imports: string[];
    language: "tsx" | "jsx";

    is_active: boolean;
    version: string;

    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

/** Row from `tool_ui_incidents` table */
export interface ToolUiIncidentRow {
    id: string;
    tool_name: string;
    component_id: string | null;
    component_type: ComponentSlot;
    error_type: IncidentErrorType;
    error_message: string;
    error_stack: string | null;
    tool_update_snapshot: unknown | null;
    component_version: string | null;
    browser_info: string | null;
    session_id: string | null;

    resolved: boolean;
    resolved_at: string | null;
    resolved_by: string | null;
    resolution_notes: string | null;

    created_at: string;
}

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export type ComponentSlot =
    | "inline"
    | "overlay"
    | "header_extras"
    | "header_subtitle"
    | "utility"
    | "fetch";

export type IncidentErrorType =
    | "compilation"
    | "runtime"
    | "fetch"
    | "timeout"
    | "unknown";

// ---------------------------------------------------------------------------
// Compiled component types
// ---------------------------------------------------------------------------

/** A fully compiled dynamic tool renderer ready for use */
export interface CompiledToolRenderer {
    toolName: string;
    displayName: string;
    resultsLabel: string | null;
    keepExpandedOnStream: boolean;
    version: string;
    componentId: string;

    /** Compiled React inline component */
    InlineComponent: React.ComponentType<DynamicRendererProps>;

    /** Compiled React overlay component (may be null) */
    OverlayComponent: React.ComponentType<DynamicRendererProps> | null;

    /** Compiled header extras function (may be null) */
    getHeaderExtras: ((toolUpdates: unknown[]) => React.ReactNode) | null;

    /** Compiled header subtitle function (may be null) */
    getHeaderSubtitle: ((toolUpdates: unknown[]) => string | null) | null;
}

/** Props passed to dynamically compiled components — same shape as ToolRendererProps */
export interface DynamicRendererProps {
    toolUpdates: unknown[];
    currentIndex?: number;
    onOpenOverlay?: (initialTab?: string) => void;
    toolGroupId?: string;
}

// ---------------------------------------------------------------------------
// Cache types
// ---------------------------------------------------------------------------

export interface CacheEntry {
    compiled: CompiledToolRenderer;
    fetchedAt: number;
    version: string;
}

// ---------------------------------------------------------------------------
// Incident reporting payload
// ---------------------------------------------------------------------------

export interface IncidentPayload {
    tool_name: string;
    component_id?: string;
    component_type: ComponentSlot;
    error_type: IncidentErrorType;
    error_message: string;
    error_stack?: string;
    tool_update_snapshot?: unknown;
    component_version?: string;
    session_id?: string;
}
