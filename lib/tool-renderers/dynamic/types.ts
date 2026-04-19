/**
 * Types for the Dynamic Tool UI Components system.
 *
 * This system allows tool renderers to be stored in the database and
 * compiled at runtime, so new tool UIs can be added without code deploys.
 */

import type { Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Database row types — derived from the generated Supabase schema so schema
// changes surface at compile time without manual type drift.
// ---------------------------------------------------------------------------

/** Row from `tool_ui_components` table */
export type ToolUiComponentRow =
    Database["public"]["Tables"]["tool_ui_components"]["Row"];

/** Row from `tool_ui_incidents` table */
export type ToolUiIncidentRow =
    Database["public"]["Tables"]["tool_ui_incidents"]["Row"];

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
