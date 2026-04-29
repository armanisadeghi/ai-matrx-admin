// utils/schema/lite.ts
//
// Slim-safe utilities. This file imports NOTHING from the entity system
// (no `globalCache`, no `processSchema`, no `initialSchemas`, no
// `entityTypes`). Slim-side callers (FlashcardComponent, /tests/matrx-table,
// etc.) import from here so their chunks don't pull in the 115k-line schema
// files transitively.
//
// `schemaUtils.ts` re-exports `ensureId` from this file so entity-side
// callers don't need to update their imports.
//
// See `~/.claude/plans/the-entity-system-which-bubbly-wind.md`.

import { v4 as uuidv4 } from "uuid";

export type DataWithOptionalId = { id?: string;[key: string]: any };
export type DataWithId = { id: string;[key: string]: any };

/**
 * Ensures every record (or each record in an array) has a string `id`.
 * Generates a UUID v4 when missing. Pure function — no entity-system
 * dependency.
 */
export function ensureId<T extends DataWithOptionalId | DataWithOptionalId[]>(
    input: T,
): T extends DataWithOptionalId[] ? DataWithId[] : DataWithId {
    if (Array.isArray(input)) {
        return input.map((item) => ({
            ...item,
            id: item.id ?? uuidv4(),
        })) as unknown as T extends DataWithOptionalId[]
            ? DataWithId[]
            : DataWithId;
    } else {
        if ("id" in input && typeof input.id === "string") {
            return input as unknown as T extends DataWithOptionalId[]
                ? DataWithId[]
                : DataWithId;
        }
        return { ...input, id: uuidv4() } as unknown as T extends DataWithOptionalId[]
            ? DataWithId[]
            : DataWithId;
    }
}
