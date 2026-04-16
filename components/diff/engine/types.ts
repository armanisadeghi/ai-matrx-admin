export type ChangeType = "added" | "removed" | "modified" | "unchanged" | "reordered";

export type ViewMode = "all" | "changes-only" | "summary" | "raw-json";

export interface DiffNodeMetadata {
  fieldType?: string;
  label?: string;
  resolvedOld?: string;
  resolvedNew?: string;
  summaryText?: string;
}

export interface DiffNode {
  path: string[];
  key: string;
  changeType: ChangeType;
  oldValue: unknown;
  newValue: unknown;
  children?: DiffNode[];
  metadata?: DiffNodeMetadata;
}

export interface DiffStats {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  total: number;
}

export interface DiffResult {
  root: DiffNode[];
  stats: DiffStats;
  hasChanges: boolean;
}

export type IdentityKeyFn = (item: unknown, index: number) => string;

export interface DiffOptions {
  excludePaths?: Set<string>;
  identityKeys?: Record<string, string | IdentityKeyFn>;
  maxDepth?: number;
  skipUnderscorePrefix?: boolean;
}
