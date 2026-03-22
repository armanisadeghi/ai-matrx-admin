// ============================================================================
// VERSIONING SYSTEM — TypeScript Type Definitions
// ============================================================================
// Shared types for the snapshot versioning system across prompts,
// prompt_builtins, and prompt_apps.
// ============================================================================

/**
 * Entity types supported by the versioning system.
 * Maps to the `entity_type` parameter used by all versioning RPCs.
 */
export type VersionEntityType = 'prompt' | 'builtin' | 'prompt_app';

// ============================================================================
// RPC Response Types
// ============================================================================

/**
 * Single row from `get_version_history` RPC.
 */
export interface VersionHistoryItem {
    version_id: string;       // UUID of the version row
    version_number: number;   // Human-readable version number
    name: string | null;      // Entity name at that version
    changed_at: string;       // ISO timestamp
    change_note: string | null;
}

/**
 * Full snapshot returned by `get_version_snapshot` RPC.
 * Shape varies by entity type — use as generic JSONB.
 */
export type VersionSnapshot = Record<string, unknown>;

/**
 * Field-level diff returned by `get_version_diff` RPC.
 */
export interface VersionDiff {
    changed_fields: Record<string, {
        version_a: unknown;
        version_b: unknown;
    }>;
    total_changes: number;
}

/**
 * Result from `promote_version` RPC.
 */
export interface PromoteVersionResult {
    success: boolean;
    promoted_from_version: number;
    new_version: number;
    entity_name: string;
}

/**
 * Single row from `check_prompt_app_drift` RPC.
 */
export interface DriftItem {
    app_id: string;
    app_name: string;
    pinned_version: number;
    current_version: number;
    versions_behind: number;
    prompt_name: string;
}

/**
 * Result from `pin_prompt_app_to_version` RPC.
 */
export interface PinVersionResult {
    success: boolean;
    pinned_version: number;
}

// ============================================================================
// Hook State Types
// ============================================================================

export interface VersionHistoryState {
    versions: VersionHistoryItem[];
    loading: boolean;
    error: string | null;
}

export interface VersionDiffState {
    diff: VersionDiff | null;
    loading: boolean;
    error: string | null;
}

export interface VersionSnapshotState {
    snapshot: VersionSnapshot | null;
    loading: boolean;
    error: string | null;
}
