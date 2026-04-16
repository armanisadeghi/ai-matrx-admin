// Engine
export { computeDiff } from "./engine/compute-diff";
export {
  flattenDiffNodes,
  filterChanges,
  filterChangesDeep,
  groupByTopLevelField,
  countChangedFields,
  aggregateStats,
  pathToString,
  formatChangeType,
  formatValue,
} from "./engine/diff-utils";
export type {
  ChangeType,
  ViewMode,
  DiffNode,
  DiffNodeMetadata,
  DiffResult,
  DiffStats,
  DiffOptions,
  IdentityKeyFn,
} from "./engine/types";

// Adapters
export { createAdapterRegistry } from "./adapters/registry";
export {
  TextFieldAdapter,
  BooleanFieldAdapter,
  TagsFieldAdapter,
  JsonObjectAdapter,
  KeyValueAdapter,
  DefaultFieldAdapter,
} from "./adapters/defaults";
export type {
  FieldAdapter,
  FieldDiffProps,
  EnrichmentContext,
  AdapterRegistry,
} from "./adapters/types";

// Views
export { DiffViewerShell } from "./views/DiffViewerShell";
export { AllChangesView } from "./views/AllChangesView";
export { ChangesOnlyView } from "./views/ChangesOnlyView";
export { SummaryView } from "./views/SummaryView";
export { RawJsonView } from "./views/RawJsonView";
