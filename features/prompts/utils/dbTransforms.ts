// features/prompts/utils/dbTransforms.ts
//
// Shared transform helpers for the `prompts` table.
// Used by Redux thunks — keeps the conversion logic in one place.

import type { PromptData, PromptDb } from "../types/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Writable columns only — `id`, `created_at`, `updated_at`, `user_id` are managed by the DB. */
export type PromptInsert = Omit<PromptDb, "id" | "created_at" | "updated_at" | "user_id" | "version">;

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
        version:          row.version,
        name:             row.name        ?? undefined,
        description:      row.description ?? undefined,
        userId:           row.user_id     ?? undefined,
        messages:         (row.messages          as PromptData["messages"])          ?? undefined,
        variableDefaults: (row.variable_defaults as PromptData["variableDefaults"]) ?? undefined,
        settings:         (row.settings          as PromptData["settings"])          ?? undefined,
        tags:             row.tags             ?? undefined,
        category:         row.category         ?? undefined,
        isArchived:       row.is_archived,
        isFavorite:       row.is_favorite,
        modelId:          row.model_id         ?? undefined,
        outputFormat:     row.output_format    ?? undefined,
        outputSchema:     row.output_schema    ?? undefined,
        tools:            row.tools            ?? undefined,
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
        tags:              data.tags               ?? null,
        category:          data.category           ?? null,
        is_archived:       data.isArchived         ?? false,
        is_favorite:       data.isFavorite         ?? false,
        model_id:          data.modelId            ?? null,
        output_format:     data.outputFormat       ?? null,
        output_schema:     data.outputSchema       ?? null,
        tools:             data.tools              ?? null,
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
    if ("tags"             in data) patch.tags               = data.tags              ?? null;
    if ("category"         in data) patch.category           = data.category          ?? null;
    if ("isArchived"       in data) patch.is_archived        = data.isArchived        ?? false;
    if ("isFavorite"       in data) patch.is_favorite        = data.isFavorite        ?? false;
    if ("modelId"          in data) patch.model_id           = data.modelId           ?? null;
    if ("outputFormat"     in data) patch.output_format      = data.outputFormat      ?? null;
    if ("outputSchema"     in data) patch.output_schema      = data.outputSchema      ?? null;
    if ("tools"            in data) patch.tools              = data.tools             ?? null;

    return patch;
}
