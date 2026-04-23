/**
 * features/tool-call-visualization — public barrel.
 *
 * Owns the entire tool-call visualization surface: canonical renderer
 * contract, registry, dynamic compiler, hardcoded renderers, the canonical
 * shell, and selectors for reading tool lifecycle state from Redux.
 *
 * Execution state (ToolLifecycleEntry) lives on the agents feature's
 * active-requests slice — this feature only reads from it.
 */

export type {
    ToolRenderer,
    ToolRendererProps,
    ToolRegistry,
} from "./types";

export {
    toolRendererRegistry,
    hasCustomRenderer,
    mightHaveDynamicRenderer,
    getInlineRenderer,
    getOverlayRenderer,
    shouldKeepExpandedOnStream,
    getToolDisplayName,
    getResultsLabel,
    getHeaderSubtitle,
    getHeaderExtras,
    registerToolRenderer,
} from "./registry/registry";

export { GenericRenderer } from "./registry/GenericRenderer";

export {
    usePrefetchToolRenderer,
    prefetchRenderer,
    refreshRenderer,
    fetchAndCompileRenderer,
    getCachedRenderer,
    invalidateCachedRenderer,
    clearRendererCache,
    isKnownNoDynamic,
} from "./dynamic";

// Canonical shell + overlay
export {
    ToolCallVisualization,
    type ToolCallVisualizationProps,
} from "./components/ToolCallVisualization";
export {
    ToolUpdatesOverlay,
    type ToolUpdatesOverlayProps,
} from "./components/ToolUpdatesOverlay";

// Selectors + hooks
export {
    selectToolLifecycle,
    selectToolLifecycleMap,
    selectAllToolLifecycles,
    selectToolCallIdsInOrder,
    selectOrderedToolLifecycles,
    selectHasAnyTools,
    useOrderedToolLifecycles,
    useToolCallIdsInOrder,
    useToolLifecycle,
    useHasAnyTools,
} from "./redux";
