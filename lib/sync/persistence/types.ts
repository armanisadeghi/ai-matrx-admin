/**
 * lib/sync/persistence/types.ts
 *
 * Common interface all persistence adapters implement. Phase 1 ships noop +
 * localStorage. Phase 2 adds Dexie. The engine never branches on adapter kind.
 */

export interface PersistenceRecord {
    /** Schema version at time of write. Used to invalidate mismatched payloads. */
    version: number;
    /** Identity key at time of write. Used to enforce identity scoping. */
    identityKey: string;
    /** Serialized slice body. Shape is opaque to the adapter. */
    body: unknown;
}

export interface PersistenceAdapter {
    /** Synchronously read a record. Returns null if missing/invalid/unavailable. */
    read(storageKey: string): PersistenceRecord | null;
    /** Write a record. Errors (quota, disabled storage) are caught + logged, never thrown. */
    write(storageKey: string, record: PersistenceRecord): void;
    /** Remove a record. Safe to call when no record exists. */
    remove(storageKey: string): void;
}
