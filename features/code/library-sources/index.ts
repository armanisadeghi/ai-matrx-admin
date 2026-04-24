"use client";

// Public surface of the library-sources module. Importing this file has
// a side effect: it registers all builtin adapters so consumers (the
// Library tree, the save router, the open hook) see them immediately.

export type {
  LibrarySourceAdapter,
  LoadedSourceEntry,
  SaveSourceArgs,
  SaveSourceResult,
  SourceEntry,
  SourceEntryField,
} from "./types";
export { RemoteConflictError, isRemoteConflictError } from "./types";
export {
  getAdapterForTabId,
  getLibrarySource,
  listLibrarySources,
  registerLibrarySource,
} from "./registry";

import { registerLibrarySource } from "./registry";
import { promptAppsAdapter } from "./adapters/prompt-apps";
import { agaAppsAdapter } from "./adapters/aga-apps";
import { toolUiComponentsAdapter } from "./adapters/tool-ui-components";

registerLibrarySource(promptAppsAdapter);
registerLibrarySource(agaAppsAdapter);
registerLibrarySource(toolUiComponentsAdapter);

// Re-export the adapters directly for tests or consumers that need to
// reach a specific one without going through the registry.
export { promptAppsAdapter, agaAppsAdapter, toolUiComponentsAdapter };
