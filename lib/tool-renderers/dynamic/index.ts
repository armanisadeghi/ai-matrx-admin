/**
 * Dynamic Tool UI Components System
 *
 * Allows tool renderers to be stored in the database and compiled at runtime.
 * This enables adding custom UIs for hundreds of MCP tools without deploying
 * new code.
 *
 * Architecture:
 * 1. Database: tool_ui_components stores TSX/JSX code per tool
 * 2. Fetcher: Loads component code from Supabase on demand
 * 3. Compiler: Babel transforms JSX to JS, executes via new Function()
 * 4. Cache: In-memory cache with TTL and negative lookup tracking
 * 5. Error Boundary: Catches runtime errors, reports incidents
 * 6. Incident Reporter: Logs errors to tool_ui_incidents table
 *
 * The registry (../registry.tsx) automatically checks for dynamic components
 * when no static renderer is found. Components are prefetched on tool_update
 * events for minimal loading delay.
 *
 * Component code stored in the database should look like a normal React file
 * with imports and export default. See allowed-imports.ts for available modules.
 */

// Core renderer components
export {
    DynamicInlineRenderer,
    DynamicOverlayRenderer,
    usePrefetchToolRenderer,
} from "./DynamicToolRenderer";

// Error boundary
export { DynamicToolErrorBoundary } from "./DynamicToolErrorBoundary";

// Fetcher
export {
    fetchAndCompileRenderer,
    prefetchRenderer,
    refreshRenderer,
} from "./fetcher";

// Cache management
export {
    getCachedRenderer,
    invalidateCachedRenderer,
    clearRendererCache,
    getCacheStats,
    isKnownNoDynamic,
} from "./cache";

// Incident reporting
export {
    reportIncident,
    reportCompilationError,
    reportRuntimeError,
    reportFetchError,
} from "./incident-reporter";

// Allowed imports info (for admin UI)
export {
    getAllAvailableImports,
    getDefaultImportsForToolRenderer,
} from "./allowed-imports";

// Types
export type {
    ToolUiComponentRow,
    ToolUiIncidentRow,
    CompiledToolRenderer,
    DynamicRendererProps,
    IncidentPayload,
    ComponentSlot,
    IncidentErrorType,
} from "./types";
