/**
 * features/files/compat/index.ts — migration-bridge shims barrel.
 *
 * ⚠️ Compatibility layer — scheduled for deletion in Phase 11.
 * Do not add new callers. New code uses the main barrel (@/features/files).
 */

export * as LegacyFileStore from "./legacy-file-store";
