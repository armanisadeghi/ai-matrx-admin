// features/prompts/utils/dbTransforms.ts
//
// Shared transform helpers for the `prompts` table.
// Used by Redux thunks — keeps the conversion logic in one place.

import type { PromptData, PromptDb } from "../types/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Writable columns only — `id`, `created_at`, `updated_at`, `user_id` are managed by the DB. */
export type PromptInsert = Omit<PromptDb, "id" | "created_at" | "updated_at" | "user_id">;

/** Partial writable columns for PATCH operations. */
export type PromptUpdate = Partial<PromptInsert>;

// ---------------------------------------------------------------------------
// DB → Frontend
// ---------------------------------------------------------------------------

/** Convert a raw DB row to the camelCase frontend shape (`PromptData`). */
export function toFrontend(row: PromptDb): PromptData {
    return {
        id:               row.id,
        createdAt:        row.created_at ? new Date(row.created_at) : undefined,
        updatedAt:        row.updated_at ? new Date(row.updated_at) : undefined,
        name:             row.name        ?? undefined,
        description:      row.description ?? undefined,
        userId:           row.user_id     ?? undefined,
        messages:         (row.messages          as PromptData["messages"])          ?? undefined,
        variableDefaults: (row.variable_defaults as PromptData["variableDefaults"]) ?? undefined,
        settings:         (row.settings          as PromptData["settings"])          ?? undefined,
    };
}

// ---------------------------------------------------------------------------
// Frontend → DB
// ---------------------------------------------------------------------------

/**
 * Build a full insert payload from a frontend record.
 * Every writable column is explicitly set; undefined values become `null`
 * so Supabase never receives TypeScript `undefined`.
 */
export function toDbInsert(
    data: Omit<PromptData, "id" | "createdAt" | "updatedAt" | "userId">
): PromptInsert {
    return {
        name:              data.name              ?? null,
        description:       data.description       ?? null,
        messages:          data.messages           ?? null,
        variable_defaults: data.variableDefaults   ?? null,
        settings:          data.settings           ?? null,
    };
}

/**
 * Build a sparse update payload from a partial frontend record.
 *
 * Uses `"key" in data` to distinguish:
 *   - field intentionally set to `null`  → included in patch
 *   - field not provided at all          → excluded from patch (no-op for that column)
 */
export function toDbUpdate(
    data: Partial<Omit<PromptData, "id" | "createdAt" | "updatedAt" | "userId">>
): PromptUpdate {
    const patch: PromptUpdate = {};

    if ("name"             in data) patch.name              = data.name              ?? null;
    if ("description"      in data) patch.description       = data.description       ?? null;
    if ("messages"         in data) patch.messages           = data.messages           ?? null;
    if ("variableDefaults" in data) patch.variable_defaults = data.variableDefaults   ?? null;
    if ("settings"         in data) patch.settings           = data.settings           ?? null;

    return patch;
}
