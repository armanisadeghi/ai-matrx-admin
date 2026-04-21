// ============================================================================
// features/agent-apps — public surface
// ============================================================================
// Agent-backed version of features/prompt-apps. Phase 8 ships the public
// runner + DB + APIs; Phase 9 will build the full authenticated management
// UI on top of these primitives.
// ============================================================================

export * from "./types";

export { AgentAppPublicRenderer } from "./components/AgentAppPublicRenderer";
export { AgentAppRenderer } from "./components/AgentAppRenderer";
export { AgentAppErrorBoundary } from "./components/AgentAppErrorBoundary";
export { AgentAppEditor } from "./components/AgentAppEditor";
export { AgentAppPreview } from "./components/AgentAppPreview";
export { AgentAppHeaderCompact } from "./components/AgentAppHeaderCompact";
export { SearchableAgentSelect } from "./components/SearchableAgentSelect";
export type { AgentOption } from "./components/SearchableAgentSelect";

export { CreateAgentAppForm } from "./components/CreateAgentAppForm";
export { CreateAgentAppModal } from "./components/CreateAgentAppModal";
export { UpdateAgentAppModal } from "./components/UpdateAgentAppModal";
export {
  AgentAppAdminActions,
  type AgentAppAdminActionPatch,
} from "./components/AgentAppAdminActions";

export { AgentAppCard } from "./components/layouts/AgentAppCard";
export { AgentAppListItem } from "./components/layouts/AgentAppListItem";
export { AgentAppsGrid } from "./components/layouts/AgentAppsGrid";
export { AgentAppActionModal } from "./components/layouts/AgentAppActionModal";

export {
  getTemplateForDisplayMode,
  DISPLAY_MODE_OPTIONS,
  displayModeSupportsChat,
  getDefaultDisplayMode,
} from "./sample-code/templates";

export {
  generateSlugCandidates,
  generateAppSlug,
  isSlugAvailable,
  validateSlugsInBatch,
} from "./services/slug-service";

export {
  ALLOWED_IMPORTS_CONFIG,
  getAllowedImportsList,
  getDefaultImportsForNewApps,
  buildComponentScope,
  patchScopeForMissingIdentifiers,
  getScopeFunctionParameters,
  isImportAllowed,
  getImportDescription,
} from "./utils/allowed-imports";

export {
  getAgentAppIconsMetadata,
  type AgentAppIconsVariant,
} from "./utils/favicon-metadata";
