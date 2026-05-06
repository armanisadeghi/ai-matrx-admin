// lib/redux/sagas/storage/config.ts
//
// Phase 5 follow-up — empty slice list. The legacy `createStorageSyncSaga`
// persists Redux slice state to `localStorage["redux/${slice}/state"]`. Two
// problems with the previous config (`['notes', 'tags']`):
//
//   1. Notes are sourced from Supabase. `features/notes/redux/autoSaveMiddleware.ts`
//      already handles writes to Supabase (debounced, dirty-field aware,
//      with realtime echo suppression). Persisting the full notes slice
//      to localStorage on every action was duplicate work AND blew past
//      the ~5MB LS quota for users with many notes loaded — leading to
//      `Storage sync failed for notes: QuotaExceededError`. Notes don't
//      need LS at all.
//
//   2. There is no `tags` reducer mounted in `lib/redux/rootReducer.ts`.
//      Dead config.
//
// Both removed. The saga itself stays in place — no slices means no work,
// and removing it would require touching `lib/redux/sagas/rootSaga.ts`.
// A future cleanup pass can delete `storageSyncSaga.ts` entirely once
// confirmed unused. For now, keep it inert.

export const storageSyncConfig = {
    slices: [] as readonly string[],
    excludePaths: {} as Record<string, readonly string[]>,
    debounceMs: 2000,
    checkIntervalMs: 1000,
    storagePrefix: 'redux'
} as const;
